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

export function brahmosNode(props, values, key) {
  return {
    /** Common node properties */
    nodeType: null,
    key,
    added: false,
    ref: null,

    /** Component specific properties */
    type: null,
    props,
    componentInstance: null,
    portalContainer: null,
    mountHandler: null,

    /** tag node specific properties */
    element: '',
    values,
    templateNode: null,
    template: null,
  };
}
