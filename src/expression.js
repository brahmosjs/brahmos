import { isBrahmosNode, isTagNode, TAG_ELEMENT_NODE, isComponentNode } from './brahmosNode';
import { createTagNode } from './tags';
import createElement, { createTagElement } from './createElement';

export default function expression (node) {
  if (isBrahmosNode(node)) {
    /**
     * if node is not added earlier add a added flag and return the node
     * Otherwise clone the node and return new node
     */
    if (!node.added) {
      node.added = true;

      // if it is a tag node recursively add added flag
      if (isTagNode(node)) {
        node.values.forEach(expression);
      }
      return node;
    } else if (isComponentNode(node)) {
      // create a new element and return that
      const { type, ref, key, props } = node;
      return createElement(type, { ref, key, ...props }, props.children);
    } else if (node.nodeType === TAG_ELEMENT_NODE) {
      // create a new tag element and return it
      const { element, values } = node;
      return createTagElement(element, values[0], values[1]);
    } else {
      return createTagNode(node.template, expression(node.values));
    }
  } else if (Array.isArray(node)) {
    const newArray = [];
    for (let i = 0, ln = node.length; i < ln; i++) {
      newArray.push(expression(node[i]));
    }
    return newArray;
  } else {
    return node;
  }
}
