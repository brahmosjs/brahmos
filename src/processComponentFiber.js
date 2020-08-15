import {
  cloneChildrenFibers,
  createAndLink,
  resetToCommittedChild,
  markPendingEffect,
  setCurrentComponentFiber,
} from './fiber';

import functionalComponentInstance from './functionalComponentInstance';
import { CLASS_COMPONENT_NODE } from './brahmosNode';
import { getClosestSuspenseFiber } from './circularDep';

import { cleanEffects } from './hooks';
import { callLifeCycle } from './utils';
import { getPendingUpdates } from './updateUtils';

import shallowEqual from './helpers/shallowEqual';
import { BRAHMOS_DATA_KEY, EFFECT_TYPE_OTHER, UPDATE_TYPE_DEFERRED } from './configs';
import { Component } from './Component';

export function getErrorBoundaryFiber(fiber) {
  const { root } = fiber;

  while (
    (fiber = fiber.parent) &&
    !(
      fiber.nodeInstance instanceof Component &&
      (fiber.nodeInstance.componentDidCatch || fiber.node.type.getDerivedStateFromError)
    )
  ) {
    if (fiber === root) return null;
  }

  return fiber;
}

export function getErrorInfo(fiber) {
  const {
    node: { type: Component },
  } = fiber;
  const componentName = Component.displayName || Component.name;
  const error = `The above error occurred in the <${componentName}> component:`;

  // TODO: write error stack information here.
  return {
    componentStack: error,
  };
}

function getCurrentContext(fiber) {
  const {
    node: { type: Component },
    nodeInstance,
    parent,
    context: currentContext,
  } = fiber;

  // if component has createContext index, we treat it as provider
  const { __ccId } = Component;
  const context = parent.context || {};

  // if component is not a provider return the same context
  if (!__ccId) return context;

  /**
   * if there is a context on fiber node and the nodeInstance
   * is reused we can always return that context,
   * if provider in parent hierarchy is changed, the whole child hierarchy will
   * be different and nodeInstance are not reused.
   */
  if (currentContext) return currentContext;

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
function resetLoopToComponentsFiber(fiber) {
  const { root, nodeInstance } = fiber;

  // mark component as dirty, so it can be rendered again
  nodeInstance[BRAHMOS_DATA_KEY].isDirty = true;

  // set the alternate fiber as retry fiber, as
  root.retryFiber = fiber;
}

export default function processComponentFiber(fiber) {
  const { node, part, root, childFiberError } = fiber;
  const { type: Component, nodeType, props = {} } = node;
  const { currentTransition } = root;

  const isDeferredUpdate = root.updateType === UPDATE_TYPE_DEFERRED;

  let shouldUpdate = true;
  let usedMemoizedValue = false;
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
  const context = getCurrentContext(fiber);

  // store context in fiber
  fiber.context = context;

  /**
   * If it is a class component,
   * associate state, props to component instance
   * and call all the life cycle method which comes before rendering.
   */
  if (isClassComponent) {
    const { committedValues, memoizedValues } = brahmosData;

    // if it is first render we should store the initial state on committedValues
    if (isFirstRender) committedValues.state = nodeInstance.state;

    let { props: prevProps, state: prevState } = committedValues;

    if (
      memoizedValues &&
      isDeferredUpdate &&
      currentTransition.transitionId === memoizedValues.transitionId
    ) {
      ({ props: prevProps, state: prevState } = memoizedValues);
      usedMemoizedValue = true;
    }

    //
    /**
     * reset the component instance values to prevProps and prevState,
     * The state and prop value might have been effected by deferred rendering
     * For sync render it should point to previous committed value, and for
     * deferred render it should point to memoized values
     */
    nodeInstance.props = prevProps;
    nodeInstance.state = prevState;

    const { shouldComponentUpdate } = nodeInstance;

    let state = prevState;

    // apply the pending updates in state if
    const pendingUpdates = getPendingUpdates(fiber);
    if (pendingUpdates.length) state = getUpdatedState(prevState, pendingUpdates);

    const checkShouldUpdate = !isFirstRender && root.forcedUpdateWith !== nodeInstance;

    // call getDerivedStateFromProps lifecycle with the unCommitted state and apply the derivedState on state
    const derivedState = callLifeCycle(Component, 'getDerivedStateFromProps', [props, state]);

    const derivedErrorState = childFiberError
      ? callLifeCycle(Component, 'getDerivedStateFromError', [childFiberError.error])
      : undefined;

    if (derivedState || derivedErrorState)
      state = { ...state, ...derivedState, ...derivedErrorState };

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
    if (contextType) {
      const { id, defaultValue } = contextType;
      const provider = context[id];
      const contextValue = provider ? provider.props.value : defaultValue;

      // if it is a first render subscribe component for provider value change
      if (provider && isFirstRender) {
        provider.sub(nodeInstance);
      }
      nodeInstance.context = contextValue;
    }

    // set the new state, props, context and reset uncommitted state
    nodeInstance.state = state;
    nodeInstance.props = props;

    // store the state and props on memoized value as well
    if (isDeferredUpdate) {
      brahmosData.memoizedValues = {
        state,
        props,
        transitionId: currentTransition.transitionId,
      };
    }
  } else if (!isFirstRender) {
    // for functional component call cleanEffect only on second render
    // alternate will be set on second render
    // NOTE: This is buggy, cleanEffects should be called before commit phase, check the behavior of react.
    cleanEffects(fiber);
  }

  // render the nodes
  if (shouldUpdate) {
    try {
      // set the current component fiber we are processing
      setCurrentComponentFiber(fiber);

      // increment the render count. This is to track how many times a component is rendered in a render cycle
      brahmosData.renderCount += 1;

      // if the component is error boundary and it does not have getDerivedStateFromError, render null
      const hasNonHandledError = childFiberError && !Component.getDerivedStateFromError;
      const childNodes = hasNonHandledError ? null : nodeInstance.__render(props);

      // once render is called reset the current component fiber
      setCurrentComponentFiber(null);

      // component will always return a single node so we can pass the previous child as current fiber
      createAndLink(childNodes, part, fiber.child, fiber, fiber);
    } catch (error) {
      const errorBoundary = getErrorBoundaryFiber(fiber);
      // TODO: handle error boundaries

      // if error is a suspender, handle the suspender in suspense component
      // TODO: this is very basic case for suspender, add better code to check if it is a suspender
      if (typeof error.then === 'function') {
        const suspenseFiber = getClosestSuspenseFiber(fiber);

        /**
         * if there is no suspense in parent hierarchy throw error that suspender can't be
         * used outside of suspense
         * TODO: think for better message
         */
        if (!suspenseFiber) {
          throw new Error(`Rendering which got suspended can't be used outside of suspense.`);
        }

        suspenseFiber.nodeInstance.handleSuspender(error, suspenseFiber);

        // reset the work loop to suspense fiber
        resetLoopToComponentsFiber(suspenseFiber);
        /**
         * else if there is any error boundary handle the error in error boundary
         * It should not handle error if its already been handled once
         */
      } else if (errorBoundary && !errorBoundary.childFiberError) {
        const errorInfo = getErrorInfo(fiber);
        // log the error and retry rendering
        console.error(error);
        console.error(errorInfo.componentStack);
        errorBoundary.childFiberError = { error, errorInfo };

        // reset the work loop to errorBoundary fiber
        resetLoopToComponentsFiber(errorBoundary);

        // else throw error
      } else {
        throw error;
      }

      return;
    }
    // mark that the fiber has uncommitted effects
    markPendingEffect(fiber, EFFECT_TYPE_OTHER);
    /**
     * If we are using memoized values and shouldUpdate is false,
     * we might have some pending nodes from last render, in which case
     * we should create new child fibers with pending nodes.
     */
  } else if (usedMemoizedValue) {
    const { child } = fiber;

    if (!child || child.node !== brahmosData.nodes) {
      createAndLink(brahmosData.nodes, part, child, fiber, fiber);

      // mark that the fiber has uncommitted effects
      markPendingEffect(fiber, EFFECT_TYPE_OTHER);
    }
    /**
     * if we don't need to update the child fibers, we should clone the child fiber from current tree
     * But if had memoized props and states and no update is required, it means we already are
     * pointing to correct child fibers, in which case we shouldn't clone the child
     */
  } else {
    // clone the existing nodes
    cloneChildrenFibers(fiber);
  }
}
