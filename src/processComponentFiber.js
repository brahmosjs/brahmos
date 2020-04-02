import { toFibers } from './fiber';

import functionalComponentInstance from './functionalComponentInstance';
import { CLASS_COMPONENT_NODE } from './brahmosNode';
import { PureComponent } from './Component';

import { mergeState, callLifeCycle } from './utils';
import shallowEqual from './helpers/shallowEqual';

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

export default function processComponentFiber(fiber) {
  const { node, part, alternate } = fiber;
  const { type: Component, nodeType, props = {}, ref } = node;

  const { node: oldNode = {} } = alternate || {};

  let isFirstRender = false;
  let isReused = false;
  let shouldUpdate = true;
  const isClassComponent = nodeType === CLASS_COMPONENT_NODE;

  // if an alternate fiber is there and its of same node type assign componentInstance from the old fiber
  if (oldNode.type === Component) {
    node.componentInstance = oldNode.componentInstance;

    // if nothing has been changed early return
    // if (node.props === oldNode.props) {
    //   return;
    // }

    isReused = true;
  }

  /** If Component instance is not present on node create a new instance */
  let { componentInstance } = node;

  if (!componentInstance) {
    // create an instance of the component
    componentInstance = isClassComponent
      ? new Component(props)
      : functionalComponentInstance(Component);

    // keep the reference of instance to the node.
    node.componentInstance = componentInstance;

    isFirstRender = true;
  }

  // add fiber reference on component instance, so the component is aware of its fiber
  componentInstance.__fiber = fiber;

  // get current context
  const context = getCurrentContext(fiber, isReused);

  /**
   * If it is a class component,
   * associate state, props, context and ref
   * and call all the life cycle method which comes before rendering.
   */
  if (isClassComponent) {
    const { __unCommittedState, state: prevState, shouldComponentUpdate } = componentInstance;

    let state = __unCommittedState || prevState;

    const checkShouldUpdate = !isFirstRender;

    // call getDerivedStateFromProps hook with the unCommitted state
    state = mergeState(state, callLifeCycle(Component, 'getDerivedStateFromProps', [props, state]));
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
    componentInstance.__unCommittedState = undefined;
  }

  // render the nodes
  if (shouldUpdate) {
    try {
      const childNodes = componentInstance.__render(props);
      toFibers(childNodes, part, fiber);
    } catch (err) {
      console.log(err);
      // handler the error case later
    }

    // schedule effects
    // TODO: Handle effects
  }
}
