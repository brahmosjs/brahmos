// @flow
import { isNil } from './utils';

import type { BrahmosNode, ObjectLiteral } from './flow.types';
import { REACT_ELEMENT } from './configs';

export const TAG_NODE = Symbol.for('tag');
export const TAG_ELEMENT_NODE = Symbol.for('tag-element');
export const CLASS_COMPONENT_NODE = Symbol.for('class-component');
export const FUNCTIONAL_COMPONENT_NODE = Symbol.for('functional-component');
export const ATTRIBUTE_NODE = Symbol.for('attribute');

type NotNil = $NonMaybeType<mixed>;

// $FlowFixMe: As we are just comparing a property, on any type of non nil node
export function isTagElementNode({ nodeType }: NotNil): boolean {
  return nodeType === TAG_ELEMENT_NODE;
}

// $FlowFixMe: As we are just comparing a property, on any type of non nil node
export function isHtmlTagNode({ nodeType }: NotNil): boolean {
  return nodeType === TAG_NODE;
}

export function isTagNode(node: NotNil): boolean {
  return isTagElementNode(node) || isHtmlTagNode(node);
}

// $FlowFixMe: As we are just comparing a property, on any type of non nil node
export function isComponentNode({ nodeType }: NotNil): boolean {
  return nodeType === CLASS_COMPONENT_NODE || nodeType === FUNCTIONAL_COMPONENT_NODE;
}

export function isBrahmosNode(node: any): boolean {
  return !!node && (isTagNode(node) || isComponentNode(node));
}

/**
 * Function to check if a node should be rendered as string
 */
export function isPrimitiveNode(node: any): boolean {
  return typeof node === 'string' || typeof node === 'number';
}

/**
 * Function to check if node can be rendered or not
 */
export function isRenderableNode(node: any): boolean {
  return !(isNil(node) || typeof node === 'boolean');
}

/**
 * Get the key of looped node
 */
export function getKey(node: BrahmosNode, index: number): number | string {
  const key = node && node.key;

  /**
   * if key is defined use key or else use index as key.
   */
  return key === undefined ? index : key;
}

export function brahmosNode(props: ?ObjectLiteral, values: ?Array<any>, key?: string): BrahmosNode {
  return {
    $$typeof: REACT_ELEMENT,
    /** Common node properties */
    nodeType: null,
    key,
    ref: null,
    portalContainer: null,

    /** Component specific properties */
    type: null,
    props,

    /** tag node specific properties */
    values,
    template: null,
  };
}
