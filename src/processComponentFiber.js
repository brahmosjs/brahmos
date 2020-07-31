import {
  cloneChildrenFibers,
  createAndLink,
  resetToCommittedChild,
  markPendingEffect,
  setCurrentFiber,
} from './fiber';

import functionalComponentInstance from './functionalComponentInstance';
import { CLASS_COMPONENT_NODE } from './brahmosNode';
import { getClosestSuspenseFiber } from './circularDep';

import { cleanEffects } from './hooks';
import { callLifeCycle } from './utils';
import { getPendingUpdates } from './updateMetaUtils';

import shallowEqual from './helpers/shallowEqual';
import { BRAHMOS_DATA_KEY, EFFECT_TYPE_OTHER } from './configs';

function getCurrentContext(fiber, isReused) {
  const {
    node: { type: Component },
    nodeInstance,
    parent,
    context: currentContext,
  } = fiber;

  // if component has createContext index, we treat it as provider
  const { __ccId } = Component;
  const { context } = parent;

  // if component is not a provider return the same context
  if (!__ccId) return context;

  /**
   * if there is a context on fiber node and the nodeInstance
   * is reused we can always return that context,
   * if provider in parent hierarchy is changed, the whole child hierarchy will
   * be different and nodeInstance are not reused.
   */
  if (currentContext && isReused) return currentContext;

  // for new provider instance create a new context extending the parent context
  const newContext = Object.create(context);

  // store the nodeInstance
  newContext[__ccId] = nodeInstance;

  return newContext;
}

function getUpdatedState(prevState, updates) {
  return updates.reduce((combinedState, { state }) => {
    if (typeof state === 'function') state = state(combinedState);
    return { ...combinedState, ...state };
  }, prevState);
}

// method to reset work loop to a fiber of given component
function resetLoopToComponentsFiber(suspenseFiber) {
  const { root, nodeInstance } = suspenseFiber;

  // mark component as dirty, so it can be rendered again
  nodeInstance[BRAHMOS_DATA_KEY].isDirty = true;

  // set the alternate fiber as retry fiber, as
  root.retryFiber = suspenseFiber;
}

export default function processComponentFiber(fiber) {
  // set the current fiber we are processing
  setCurrentFiber(fiber);

  const { node, part, root } = fiber;
  const { type: Component, nodeType, props = {}, ref } = node;

  const isReused = false;
  let shouldUpdate = true;
  const isClassComponent = nodeType === CLASS_COMPONENT_NODE;

  /**
   * Reset the fiber children to a committed child
   */
  resetToCommittedChild(fiber);

  /** If Component instance is not present on node create a new instance */
  let { nodeInstance } = fiber;
  let isFirstRender = false;
  if (!nodeInstance) {
    // create an instance of the component
    nodeInstance = isClassComponent ? new Component(props) : functionalComponentInstance(Component);

    // keep the reference of instance to the node.
    fiber.nodeInstance = nodeInstance;

    isFirstRender = true;
  }

  const brahmosData = nodeInstance[BRAHMOS_DATA_KEY];

  // get current context
  const context = getCurrentContext(fiber, isReused);

  // store context in fiber
  fiber.context = context;

  /**
   * If it is a class component,
   * associate state, props, context and ref
   * and call all the life cycle method which comes before rendering.
   */
  if (isClassComponent) {
    const { committedValues } = brahmosData;

    // if it is first render we should store the initial state on committedValues
    if (isFirstRender) committedValues.state = nodeInstance.state;

    const { props: prevProps, state: prevState } = committedValues;

    const { shouldComponentUpdate } = nodeInstance;

    let state = prevState;

    // apply the pending updates in state if
    const pendingUpdates = getPendingUpdates(fiber);
    if (pendingUpdates.length) state = getUpdatedState(prevState, pendingUpdates);

    const checkShouldUpdate = !isFirstRender && root.forcedUpdateWith !== nodeInstance;

    // call getDerivedStateFromProps lifecycle with the unCommitted state and apply the derivedState on state
    const derivedState = callLifeCycle(Component, 'getDerivedStateFromProps', [props, state]);
    if (derivedState) state = { ...state, ...derivedState };

    // call callbacks of setState with new state
    pendingUpdates.forEach(({ callback }) => {
      if (callback) callback(state);
    });
    /**
     * check if component is instance of PureComponent, if yes then,
     * do shallow check for props and states
     */

    if (nodeInstance.isPureReactComponent && checkShouldUpdate) {
      shouldUpdate = !shallowEqual(state, prevState) || !shallowEqual(props, prevProps);
    }

    /**
     * check if component should update or not. If PureComponent shallow check has already
     * marked component to not update then we don't have to call shouldComponentUpdate
     * Also we shouldn't call shouldComponentUpdate on first render
     */
    if (shouldComponentUpdate && shouldUpdate && checkShouldUpdate) {
      shouldUpdate = shouldComponentUpdate.call(nodeInstance, props, state);
    }

    /**
     * If it is a context consumer add provider on the props
     */
    const { contextType } = Component;
    let contextValue;
    if (contextType) {
      const { id, defaultValue } = contextType;
      const provider = context[id];
      contextValue = provider ? provider.props.value : defaultValue;

      // if it is a first render subscribe component for provider value change
      if (provider && isFirstRender) {
        provider.sub(nodeInstance);
      }
    }

    // set the new state, props, context and reset uncommitted state
    nodeInstance.state = state;
    nodeInstance.props = props;
    nodeInstance.context = contextValue;
  } else if (!isFirstRender) {
    // for functional component call cleanEffect only on second render
    // alternate will be set on second render
    // NOTE: This is buggy, cleanEffects should be called before commit phase, check the behavior of react.
    cleanEffects(fiber);
  }

  // render the nodes
  if (shouldUpdate) {
    try {
      const childNodes = nodeInstance.__render(props);

      // component will always return a single node so we can pass the previous child as current fiber
      createAndLink(childNodes, part, fiber.child, fiber, fiber);
    } catch (err) {
      const { errorBoundary } = fiber;
      // TODO: handle error boundaries

      // if error is a suspender, handle the suspender in suspense component
      // TODO: this is very basic case for suspender, add better code to check if it is a suspender
      if (typeof err.then === 'function') {
        const suspenseFiber = getClosestSuspenseFiber(fiber);

        /**
         * if there is no suspense in parent hierarchy throw error that suspender can't be
         * used outside of suspense
         * TODO: think for better message
         */
        if (!suspenseFiber) {
          throw new Error(`Rendering which got suspended can't be used outside of suspense.`);
        }

        suspenseFiber.nodeInstance.handleSuspender(err, suspenseFiber);

        // reset the work loop to suspense fiber
        resetLoopToComponentsFiber(suspenseFiber);

        // else if there is any error boundary handle the error in error boundary
      } else if (errorBoundary) {
        errorBoundary.__handleError(err);

        // reset the work loop to errorBoundary fiber
        resetLoopToComponentsFiber(errorBoundary);

        // else throw error
      } else {
        throw err;
      }

      return;
    }
    // mark that the fiber has uncommitted effects
    markPendingEffect(fiber, EFFECT_TYPE_OTHER);
  } else {
    // clone the existing nodes
    cloneChildrenFibers(fiber);
  }
}
