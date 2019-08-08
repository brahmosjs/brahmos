import { isBrahmosNode } from './utils';
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
      if (node.__$isBrahmosTag$__) {
        node.values.forEach(expression);
      }
      return node;
    } else if (node.__$isBrahmosComponent$__) {
      // create a new element and return that
      const { type, configs, children } = node;
      return createElement(type, configs, children);
    } else if (node.__$isBrahmosTagElement$__) {
      // create a new tag element and return it
      const { element, values } = node;
      return createTagElement(element, values[0], values[1]);
    } else {
      // copy and remove the templateNode instance, and old value
      return {
        template: node.template,
        values: expression(node.values),
        __$isBrahmosTag$__: true,
      };
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
