import { createCurrentAndLink, cloneChildrenFibers, linkEffect, fibers } from './fiber';

import functionalComponentInstance from './functionalComponentInstance';
import { CLASS_COMPONENT_NODE } from './brahmosNode';
import { PureComponent, Suspense, getClosestSuspense } from './circularDep';

import { cleanEffects } from './hooks';
import { callLifeCycle } from './utils';
import { getPendingUpdates } from './updateMetaUtils';

import shallowEqual from './helpers/shallowEqual';
import { BRAHMOS_DATA_KEY, UPDATE_TYPE_DEFERRED } from './configs';

function getCurrentContext(fiber, isReused) {
  const {
    node: { type: Component, componentInstance },
    parent,
    context: currentContext,
  } = fiber;

  // if component has createContext index, we treat it as provider
  const { __ccId } = Component;
  const { context } = parent;

  // if component is not a provider return the same context
  if (!__ccId) return context;

  /**
   * if there is a context on fiber node and the componentInstance
   * is reused we can always return that context,
   * if provider in parent hierarchy is changed, the whole child hierarchy will
   * be different and componentInstance are not reused.
   */
  if (currentContext && isReused) return currentContext;

  // for new provider instance create a new context extending the parent context
  const newContext = Object.create(context);

  // store the componentInstance
  newContext[__ccId] = componentInstance;

  return newContext;
}

function getUpdatedState(prevState, updates) {
  return updates.reduce((combinedState, { state }) => {
    if (typeof state === 'function') state = state(combinedState);
    return { ...combinedState, ...state };
  }, prevState);
}

// method to reset work loop to a fiber of given component
function resetLoopToFiber(component) {
  const brahmosData = component[BRAHMOS_DATA_KEY];
  const { fiber } = brahmosData;
  const { root, alternate } = fiber;
  const { updateType } = root;

  // mark component as dirty, so it can be rendered again
  brahmosData.isDirty = true;

  /**
   * if updateType is deferred we should reset the child to current tree's child,
   * so that the work loop in wip tree should behave as it should without reset.
   */
  if (updateType === UPDATE_TYPE_DEFERRED) {
    fiber.child = alternate && alternate.child;
  }

  root.retryFiber = fiber;
}

export default function processComponentFiber(fiber) {
  const { node, part, alternate, root } = fiber;
  const { updateType } = root;
  const { type: Component, nodeType, props = {}, ref } = node;

  const isFirstRender = false;
  const isReused = false;
  let shouldUpdate = true;
  const isClassComponent = nodeType === CLASS_COMPONENT_NODE;

  /**
   * If an alternate fiber is present it means the parent is rendered,
   * but the fiber can reuse the previous instance
   *
   * Note: alternate fiber may not be present if parent never re-renders, but in which case
   * node will already have componentInstance and the processing of fiber is happening due to
   * state change and not parent render.
   */
  if (alternate) {
    node.componentInstance = alternate.node.componentInstance;
  }

  /** If Component instance is not present on node create a new instance */
  let { componentInstance } = node;
  let firstRender;
  if (!componentInstance) {
    // create an instance of the component
    componentInstance = isClassComponent
      ? new Component(props)
      : functionalComponentInstance(Component);

    // keep the reference of instance to the node.
    node.componentInstance = componentInstance;

    firstRender = true;
  }

  const brahmosData = componentInstance[BRAHMOS_DATA_KEY];

  // add fiber reference on component instance, so the component is aware of its fiber
  brahmosData.fiber = fiber;

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
    const { props: prevProps, state: prevState } = brahmosData.committedValues;

    const { shouldComponentUpdate } = componentInstance;

    // if component is of Suspense type add it in fiber
    if (componentInstance instanceof Suspense) {
      fiber.suspense = componentInstance;
    }

    const pendingUpdates = getPendingUpdates(updateType, componentInstance);

    let state = getUpdatedState(prevState, pendingUpdates);

    const checkShouldUpdate = !isFirstRender;

    // call getDerivedStateFromProps hook with the unCommitted state
    state = { ...state, ...callLifeCycle(Component, 'getDerivedStateFromProps', [props, state]) };

    // call callbacks of setState with new state
    pendingUpdates.forEach(({ callback }) => {
      if (callback) callback(state);
    });

    /**
     * check if component is instance of PureComponent, if yes then,
     * do shallow check for props and states
     */

    if (componentInstance instanceof PureComponent && checkShouldUpdate) {
      shouldUpdate = !shallowEqual(state, prevState) || !shallowEqual(props, prevProps);
    }

    /**
     * check if component should update or not. If PureComponent shallow check has already
     * marked component to not update then we don't have to call shouldComponentUpdate
     * Also we shouldn't call shouldComponentUpdate on first render
     */
    if (shouldComponentUpdate && shouldUpdate && checkShouldUpdate) {
      shouldUpdate = shouldComponentUpdate.call(componentInstance, props, state);
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
        provider.sub(componentInstance);
      }
    }

    // set the new state, props, context and reset uncommitted state
    componentInstance.state = state;
    componentInstance.props = props;
    componentInstance.context = contextValue;
  } else if (!firstRender) {
    // for functional component call cleanEffect only on second render
    // alternate will be set on second render
    // NOTE: This is buggy, cleanEffects should be called before commit phase, check the behavior of react.
    cleanEffects(componentInstance);
  }

  // render the nodes
  if (shouldUpdate) {
    try {
      const childNodes = componentInstance.__render(props);
      createCurrentAndLink(childNodes, part, fiber, fiber);
    } catch (err) {
      const { errorBoundary } = fiber;
      // TODO: handle error boundaries

      // if error is a suspender, handle the suspender in suspense component
      // TODO: this is very basic case for suspender, add better code to check if it is a suspender
      if (typeof err.then === 'function') {
        const suspense = getClosestSuspense(fiber);

        console.log(err, fiber.node.type, suspense.props.fallback.template.strings);

        /**
         * if there is no suspense in parent hierarchy throw error that suspender can't be
         * used outside of suspense
         * TODO: think for better message
         */
        if (!suspense) {
          throw new Error(`Rendering which got suspended can't be used outside of suspense.`);
        }

        suspense.handleSuspender(err);

        // reset the work loop to suspense fiber
        resetLoopToFiber(suspense);

        // else if there is any error boundary handle the error in error boundary
      } else if (errorBoundary) {
        errorBoundary.__handleError(err);

        // reset the work loop to errorBoundary fiber
        resetLoopToFiber(errorBoundary);

        // else throw error
      } else {
        throw err;
      }

      return;
    }

    linkEffect(fiber);
  } else {
    // clone the existing nodes
    cloneChildrenFibers(fiber);
  }
}
