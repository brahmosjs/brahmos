// @flow
import { isNil } from './utils';

import type { BrahmosNode, ObjectLiteral } from './flow.types';

export const TAG_NODE = Symbol('tag');
export const TAG_ELEMENT_NODE = Symbol('tag-element');
export const CLASS_COMPONENT_NODE = Symbol('class-component');
export const FUNCTIONAL_COMPONENT_NODE = Symbol('functional-component');
export const ATTRIBUTE_NODE = Symbol('attribute');

type NotNil = $NonMaybeType<mixed>;

// $FlowFixMe: As we are just comparing a property, on any type of non nil node
export function isTagElementNode({ nodeType }: NotNil): boolean {
  return nodeType === TAG_ELEMENT_NODE;
}

// $FlowFixMe: As we are just comparing a property, on any type of non nil node
export function isTagNode({ nodeType }: NotNil): boolean {
  return nodeType === TAG_NODE || nodeType === TAG_ELEMENT_NODE;
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
export function getKey(node: BrahmosNode, index: number): string {
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
    const values = ((node.values: any): Array<any>);
    for (let i = 0, ln = values.length; i < ln; i++) {
      const value = values[i];
      if (value && value.key !== undefined) {
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

export function brahmosNode(props: ?ObjectLiteral, values: ?Array<any>, key: string): BrahmosNode {
  return {
    /** Common node properties */
    nodeType: null,
    key,
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
