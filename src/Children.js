// @flow
import { isTagElementNode, isComponentNode, isTagNode } from './brahmosNode';
import { isNil } from './utils';
import type { BrahmosNode, ArrayCallback, ObjectLiteral } from './flow.types';

function isPlaceholderTagNode(children: BrahmosNode): boolean {
  /**
   * if the template string for a tag node does not have any thing,
   * it means the tag node is just used to wrap children.
   * Note: We always wrap the children except when children is already an array
   * or there is single child. We do this to make the all the children positional
   * */
  // $FlowFixMe: We are checking for tag node so template key will be present
  return isTagNode(children) && !children.template.strings.some(Boolean);
}

function getChildrenArray(children: any): ?Array<any> {
  if (isNil(children)) return undefined;
  else if (typeof children === 'boolean') return [];

  // if children is a tag node and is just a placeholder for all the children use the values from the node
  if (isPlaceholderTagNode(children)) {
    children = children.values;
  }

  if (!Array.isArray(children)) children = [children];

  return children;
}

function map(children: any, cb: ArrayCallback): ?Array<any> {
  const _children = getChildrenArray(children);
  if (!_children) return children;
  const newChildren = _children.map(cb);

  /**
   * if we got a placeholder tag node, after map,
   * we should return cloned placeholder tag nodes with updated values
   */
  if (isPlaceholderTagNode(children)) {
    return { ...children, values: newChildren };
  }

  return newChildren;
}

function toArray(children: any): Array<any> {
  const _children = getChildrenArray(children) || [];

  return _children.map((child, index) => {
    /**
     * As we have converted children to a flat array node
     * assign key to each elements if it isn't already present
     */
    if (child && child.key === undefined) {
      child.key = index;
    }
    return child;
  });
}

function forEach(children: any, cb: ArrayCallback): void {
  const _children = getChildrenArray(children) || [];
  _children.forEach(cb);
}

function only(children: any) {
  const _children = getChildrenArray(children);
  return _children && children.length === 1;
}

export const Children = {
  map,
  toArray,
  forEach,
  only,
};

export function isValidElement(node: any) {
  return node && (isComponentNode(node) || isTagElementNode(node));
}

export function cloneElement(node: any, props: ObjectLiteral, children: any): ?BrahmosNode {
  if (node) {
    if (isTagElementNode(node)) {
      const newProps = { ...node.values[0], ...props };
      return { ...node, values: [newProps, children] };
    } else if (isComponentNode(node)) {
      return { ...node, props: { ...node.props, ...props, children } };
    }
  }

  return node;
}
