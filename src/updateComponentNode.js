import functionalComponentInstance from './functionalComponentInstance';
import { PureComponent } from './Component';
import { mergeState, callLifeCycle } from './utils';
import { setRef } from './refs';

import { runEffects, cleanEffects } from './hooks';

import { addHandler } from './mountHandlerQueue';

import updateNode from './updateNode';

import shallowEqual from './helpers/shallowEqual';

function getCurrentContext (Component, componentInstance, context) {
  // if component has createContext index, we treat it as provider
  const { __ccId } = Component;
  const { __context } = componentInstance;

  // if component is not a provider return the same context
  if (!__ccId) return context;

  // if componentInstance has context return that
  if (__context) return __context;

  // if it is provider create a new context extending the parent context
  const newContext = Object.create(context);
  newContext[__ccId] = componentInstance;

  return newContext;
}

// given a component node return its underlying non component node, which has associated DOM node
function findNonComponentNode (node) {
  let componentInstance, context;

  while (node && (componentInstance = node.componentInstance) && componentInstance.__nodes) {
    node = componentInstance.__nodes;
    context = componentInstance.__context;
  }

  return { node, context };
}

function renderWithErrorBoundaries (part, node, context, shouldUpdate, forceUpdate, isSvgPart, isFirstRender, handleError) {
  const {
    type: Component,
    componentInstance,
    props,
    __$isBrahmosClassComponent$__: isClassComponent,
  } = node;

  const forceUpdateAll = forceUpdate === 'all';
  let oldNodes = componentInstance.__nodes;

  /**
   * if it is a rendered component and we are just updating the dom positions
   * We look for non component node from a component node and try to render that
   * Else we do a new render
   */
  let newNodes;
  if (forceUpdateAll && !shouldUpdate) {
    ({ node: newNodes, context } = findNonComponentNode(node));

    // if it is just an position update keep the oldNode same as new node
    oldNodes = newNodes;
  } else {
    newNodes = componentInstance.__render(props);
  }

  /**
   * clean effects for functional component,
   * no need to clean anything on the first render
   */
  if (!isFirstRender && !isClassComponent && shouldUpdate) {
    cleanEffects(componentInstance);
  }

  try {
    /**
     * store lastNode into the component instance so later
     * if the component does not have to update it should return the stored lastNode
     */

    /**
     * forward forceUpdate to component child only when forceUpdate is set to all.
     */
    componentInstance.__lastNode = updateNode(part, newNodes, oldNodes, context, forceUpdateAll, isSvgPart);
  } catch (err) {
    if (isClassComponent && handleError) {
      let { state, componentDidCatch } = componentInstance;

      /**
       * call getDerivedStateFromError if there is new state based on error try to rerender
       */

      const { getDerivedStateFromError } = Component;

      const errorState = callLifeCycle(Component, 'getDerivedStateFromError', [props, state]);

      // if there is any error state try rendering component again
      if (errorState) {
        state = mergeState(state, errorState);
        componentInstance.state = state;
        renderWithErrorBoundaries(part, node, context, shouldUpdate, forceUpdate, isSvgPart, isFirstRender, false);
      }

      // call componentDidCatch lifecycle with error
      callLifeCycle(componentInstance, 'componentDidCatch', [err]);

      // if both componentDidCatch and getDerivedStateFromError is not defined throw error
      if (!(componentDidCatch || getDerivedStateFromError)) throw err;
    } else {
      throw err;
    }
  }
}

/**
 * Update component node
 */
export default function updateComponentNode (part, node, oldNode, context, forceUpdate, isSvgPart) {
  const {
    type: Component,
    props = {},
    __$isBrahmosClassComponent$__: isClassComponent,
    ref,
  } = node;

  let isFirstRender = false;
  let shouldUpdate = true;

  /** If Component instance is not present on node create a new instance */
  let { componentInstance } = node;

  if (!componentInstance) {
    // create an instance of the component
    componentInstance = isClassComponent
      ? new Component(props)
      : functionalComponentInstance(Component);

    /**
     * store the part on the component instance,
     * so every component have the information of where it has to render
     */
    componentInstance.__part = part;

    // keep the reference of instance to the node.
    node.componentInstance = componentInstance;

    isFirstRender = true;
  }

  // get current context
  context = getCurrentContext(Component, componentInstance, context);

  // store context information on componentInstance
  componentInstance.__context = context;

  /**
   * store the node information on componentInstance, so every component
   * have the createElement instance of self
   */
  componentInstance.__componentNode = node;

  const {
    __unCommittedState,
    shouldComponentUpdate,
    props: prevProps,
    state: prevState,
  } = componentInstance;

  let snapshot;

  /**
   * If it is a class component,
   * associate state, props, context and ref
   * and call all the life cycle method which comes before rendering.
   */
  if (isClassComponent) {
    let state = __unCommittedState || prevState;

    const checkShouldUpdate = !isFirstRender && forceUpdate !== 'current';

    // call getDerivedStateFromProps hook with the unCommitted state
    state = mergeState(
      state,
      callLifeCycle(Component, 'getDerivedStateFromProps', [props, state])
    );
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

      if (provider && isFirstRender) {
        provider.sub(componentInstance);
      }
    }

    // set the new state, props, context and reset uncommitted state
    componentInstance.state = state;
    componentInstance.props = props;
    componentInstance.context = contextValue;
    componentInstance.__unCommittedState = undefined;

    // provide the correct ref
    setRef(ref, componentInstance);

    // call getSnapshotBeforeUpdate life cycle method
    snapshot = callLifeCycle(componentInstance, 'getSnapshotBeforeUpdate', [prevProps, prevState]);
  }

  /**
   * update a component update only if it can be updated based on shouldComponentUpdate
   * Or if the child component has to render based on forceUpdate
   */
  if (shouldUpdate || forceUpdate === 'all') {
    renderWithErrorBoundaries(part, node, context, shouldUpdate, forceUpdate, isSvgPart, isFirstRender, true);
  }

  // After the mount/update call the lifecycle method
  if (isClassComponent) {
    /**
     * if it is a first render then schedule the componentDidMount otherwise call componentDidUpdate if it is updated
     * We schedule componentDidMount as the component may mount in fragment, but we want to
     * call componentDidMount only after it is attached to the DOM
     */
    if (isFirstRender) {
      addHandler(componentInstance, 'componentDidMount');
    } else if (shouldUpdate) {
      callLifeCycle(componentInstance, 'componentDidUpdate', [prevProps, prevState, snapshot]);
    }
  } else {
    // call effects of functional component
    runEffects(componentInstance);
  }

  // return the component's lastNode
  return componentInstance.__lastNode;
}
