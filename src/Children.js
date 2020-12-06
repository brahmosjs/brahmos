// @flow
import { BRAHMOS_DATA_KEY } from './configs';
import { isTagElementNode, isComponentNode, isTagNode, isHtmlTagNode } from './brahmosNode';
import { getNormalizedProps, isNil, toArray } from './utils';
import type { BrahmosNode, ArrayCallback, ObjectLiteral } from './flow.types';
import parseChildren from './parseChildren';

function isPlaceholderTagNode(children: BrahmosNode): boolean {
  /**
   * if the template string for a tag node does not have any thing,
   * it means the tag node is just used to wrap children.
   * Note: We always wrap the children except when children is already an array
   * or there is single child. We do this to make the all of the child positional
   * */
  // $FlowFixMe: We are checking for tag node so template key will be present
  return isTagNode(children) && !children.template.strings.some(Boolean);
}

function flattenChildren(children) {
  let _children = [];
  children.forEach((child) => {
    if (Array.isArray(child)) {
      _children = _children.concat(flattenChildren(child));
    } else if (child && isHtmlTagNode(child)) {
      _children.push(parseChildren(child));
    } else {
      _children.push(child);
    }
  });

  return _children;
}

function getChildrenArray(children: any): ?Array<any> {
  if (isNil(children)) return undefined;
  else if (typeof children === 'boolean') return [];

  // if the transformed value is in cache return from the cache
  if (children[BRAHMOS_DATA_KEY]) return children[BRAHMOS_DATA_KEY];

  let _children = children;

  if (isPlaceholderTagNode(_children)) {
    // if children is a tag node and is just a placeholder for all the children use the values from the node
    _children = _children.values;
  }

  // if the children is a html tag node parse the whole static tree
  if (isHtmlTagNode(_children)) {
    _children = parseChildren(_children);
  }

  if (!Array.isArray(_children)) _children = [_children];

  // flatten the children
  _children = flattenChildren(_children);

  // store the transformed children in cache, so we don't perform same action again
  // Perf of adding random property in an array: https://www.measurethat.net/Benchmarks/Show/10737/1/adding-random-property-in-array
  children[BRAHMOS_DATA_KEY] = _children;

  return _children;
}

function map(children: any, cb: ArrayCallback): ?Array<any> {
  const _children = getChildrenArray(children);
  if (!_children) return children;
  return _children.map(cb);
}

function childrenToArray(children: any): Array<any> {
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

function count(children: any): number {
  const _children = getChildrenArray(children);
  return _children ? _children.length : 0;
}

export const Children = {
  map,
  toArray: childrenToArray,
  forEach,
  only,
  count,
};

export function isValidElement(node: any) {
  return node && (isComponentNode(node) || isTagElementNode(node));
}

export function cloneElement(node: any, props: ObjectLiteral): ?BrahmosNode {
  // extend props can be undefined, so have default value for it
  props = props || {};

  const argLn = arguments.length;

  // We have to add children prop in case only when third param is provided.
  if (argLn > 2) {
    const children = argLn > 3 ? toArray(arguments, 2) : arguments[2];
    props.children = children;
  }

  if (node) {
    if (isHtmlTagNode(node)) {
      const parsedChildren = parseChildren(node);
      return cloneElement(parsedChildren, props);
    } else if (isComponentNode(node) || isTagElementNode(node)) {
      return {
        ...node,
        props: { ...node.props, ...getNormalizedProps(props, false) },
        ref: props.ref,
      };
    }
  }

  return node;
}
