import { isTagElementNode, isComponentNode, isTagNode } from './brahmosNode';

const { isNil } = require('./utils');

function isPlaceholderTagNode(children) {
  /**
   * if the template string for a tag node does not have any thing,
   * it means the tag node is just used to wrap children.
   * Note: We always wrap the children except when children is already an array
   * or there is single child. We do this to make the all the children positional
   * */
  return isTagNode(children) && !children.template.strings.some(Boolean);
}

function getChildrenArray(children) {
  if (isNil(children)) return undefined;
  else if (typeof children === 'boolean') return [];

  // if children is a tag node and is just a placeholder for all the children use the values from the node
  if (isPlaceholderTagNode(children)) {
    children = children.values;
  }

  if (!Array.isArray(children)) children = [children];

  return children;
}

function map(children, cb) {
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

function toArray(children) {
  const _children = getChildrenArray(children) || [];

  return _children.map((child, index) => {
    /**
     * As we have converted children to a flat array node
     * assign key to each elements if it isn't already present
     */
    if (child.key === undefined) {
      child.key = index;
    }
    return child;
  });
}

function forEach(children, cb) {
  const _children = getChildrenArray(children) || [];
  _children.forEach(cb);
}

function only(children) {
  const _children = getChildrenArray(children);
  return _children && children.length === 1;
}

export const Children = {
  map,
  toArray,
  forEach,
  only,
};

export function isValidElement(node) {
  return node && (isComponentNode(node) || isTagElementNode(node));
}

export function cloneElement(node, props, children) {
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
