import booleanAttributes from './booleanAttributes';
import { Component } from './Component';
/**
 * Method to identify if a jsx element is a html element or custom component
 * Taken from https://github.com/babel/babel/blob/master/packages/babel-types/src/validators/react/isCompatTag.js
 * */
export function isHTMLElement (tagName) {
  // Must start with a lowercase ASCII letter
  return !!tagName && /^[a-z]/.test(tagName);
}

export function isEventAttribute (attrName) {
  // must start with on prefix
  // used indexOf for cross browser support
  return attrName.indexOf('on') === 0;
}

// get the node name from the node in lowercase format
export function getNodeName (node) {
  return node.nodeName.toLowerCase();
}

export function getEventName (attrName) {
  return attrName.replace('on', '').toLowerCase();
}

export function isBooleanAttribute (attrName) {
  // used indexOf for cross browser support
  return booleanAttributes.indexOf(attrName) !== -1;
}

export function isCustomElement (tagName) {
  // Must match html tag check and have a hyphen in the tag name
  return isHTMLElement(tagName) && tagName.indexOf('-') !== -1;
}

/**
 * A smaller utility to omit keys from objects
 */
export function omit (obj, keys) {
  const newObj = {};
  const objKeys = Object.keys(obj);
  for (let i = 0, l = objKeys.length; i < l; i++) {
    const key = objKeys[i];
    if (!keys[key]) newObj[key] = obj[key];
  }
  return newObj;
}

/**
 * Return the spread props syntax
 */
export function spreadProps (obj) {
  return {
    ...obj,
    __$isReactLitSpread$__: true,
  };
}

/**
 * Remove nodes from parent
 */

export function remove (nodes) {
  if (!Array.isArray(nodes)) nodes = [nodes];
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    node.parentNode.removeChild(node);
  }
}

/**
 * Get the key of looped node
 */
export function getKey (node, index) {
  return node.key !== undefined ? node.key : index;
}

export function isClassComponent (element) {
  return element.prototype instanceof Component;
}

/**
 * Check if a value is non zero falsy value
 */
export function isNonZeroFalsy (value) {
  return !value && value !== 0;
}
