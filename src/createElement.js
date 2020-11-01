// @flow
import { getNormalizedProps, toArray } from './utils';
import {
  brahmosNode,
  TAG_ELEMENT_NODE,
  CLASS_COMPONENT_NODE,
  FUNCTIONAL_COMPONENT_NODE,
} from './brahmosNode';

import type { BrahmosNode, Ref } from './flow.types';

type Configs = { key: string, ref: Ref, children: any };

export function createBrahmosNode(element: string | Function, props: Configs, key: string) {
  const { ref } = props;

  // There can be chances key might be in props, if key is not passed as arg try to find it in props
  if (key === undefined) key = props.key;

  // remove key and ref property from props if present
  // $FlowFixMe: It's okay to access __isForwardRef always.
  props = getNormalizedProps(props, element.__isForwardRef);

  const node = brahmosNode(props, null, key);
  node.type = element;

  /**
   * If the create element is receiving an string element it means it is not a component,
   * but a simple tag instead. In that case set the nodeType to tagElement
   */
  if (typeof element === 'string') {
    node.nodeType = TAG_ELEMENT_NODE;
    node.ref = ref;

    return node;
  }

  // otherwise if its a component handle the component node
  const _isClassComponent = element.prototype && element.prototype.isReactComponent;

  node.nodeType = _isClassComponent ? CLASS_COMPONENT_NODE : FUNCTIONAL_COMPONENT_NODE;

  // Add ref for class component
  node.ref = _isClassComponent ? ref : null;

  // if the element is a lazy component, start fetching the underlying component
  if (element.__loadLazyComponent) element.__loadLazyComponent();

  // add default props values
  const defaultProps = typeof element === 'function' && element.defaultProps;
  if (defaultProps) {
    for (key in defaultProps) {
      if (props[key] === undefined) props[key] = defaultProps[key];
    }
  }

  return node;
}

export function createElement(
  element: string | Function,
  props: Configs,
  children: any,
): BrahmosNode {
  props = props || {};
  /**
   * If there is single children no need to keep it as an array
   */
  const argLn = arguments.length;
  const _children = argLn > 3 ? toArray(arguments, 2) : children;

  // add children to props
  if (_children) props.children = _children;

  return createBrahmosNode(element, props, props.key);
}
