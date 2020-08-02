import { isNil } from './utils';

export const TAG_NODE = Symbol('tag');
export const TAG_ELEMENT_NODE = Symbol('tag-element');
export const CLASS_COMPONENT_NODE = Symbol('class-component');
export const FUNCTIONAL_COMPONENT_NODE = Symbol('functional-component');
export const ATTRIBUTE_NODE = Symbol('attribute');

export function isTagNode({ nodeType }) {
  return nodeType === TAG_NODE || nodeType === TAG_ELEMENT_NODE;
}

export function isComponentNode({ nodeType }) {
  return nodeType === CLASS_COMPONENT_NODE || nodeType === FUNCTIONAL_COMPONENT_NODE;
}

export function isBrahmosNode(node) {
  return node && (isTagNode(node) || isComponentNode(node));
}

/**
 * Function to check if a node should be rendered as string
 */
export function isPrimitiveNode(node) {
  return typeof node === 'string' || typeof node === 'number';
}

/**
 * Function to check if node can be rendered or not
 */
export function isRenderableNode(node) {
  return !(isNil(node) || typeof node === 'boolean');
}

/**
 * Get the key of looped node
 */
export function getKey(node, index) {
  /**
   * Get the key from node directly if not
   * found search key on the values
   */
  let key = node && node.key;
  if (key === '' && node && isTagNode(node)) {
    /**
     * TODO: This might be buggy, it can give key from any node,
     * not necessarily key from the root node.
     */
    const { values } = node;
    for (let i = 0, ln = values.length; i < ln; i++) {
      const value = values[i];
      if (value.key !== undefined) {
        key = '' + value.key;
        break;
      }
    }

    // store the calculated key on node so we don't have to search next time on same node
    node.key = key === undefined ? '' : '' + key;
  }

  /**
   * if key is defined use key or else use index as key.
   * Also key should always be a string
   */
  return key === '' ? '' + index : key;
}

export function brahmosNode(props, values, key) {
  return {
    /** Common node properties */
    nodeType: null,
    key,
    added: false,
    ref: null,
    portalContainer: null,

    /** Component specific properties */
    type: null,
    props,

    /** tag node specific properties */
    element: '',
    values,
    template: null,
  };
}
