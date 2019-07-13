import { Component } from './Component';

export const RESERVED_ATTRIBUTES = {
  key: 1,
  ref: 1,
};

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
  /**
   * Get the key from node directly if not
   * found search key on the values
   */
  let key = node && node.key;
  if (key === undefined && node && node.__$isBrahmosTag$__) {
    /**
       * TODO: This might be buggy, it can give key from any node,
       * not necessarily key from the root node.
       */
    const { values } = node;
    for (let i = 0, ln = values.length; i < ln; i++) {
      const value = values[i];
      if (value.key !== undefined) {
        key = value.key;
        break;
      }
    }

    // store the calculated key on node so we don't have to search next time on same node
    node.key = key;
  }

  /**
   * if key is defined use key or else use index as key.
   * Also key should always be a string
   */
  return (key !== undefined ? key : index).toString();
}

export function isClassComponent (element) {
  return element.prototype instanceof Component;
}

/**
 * Convert an array like object to array
 */

export function toArray (list) {
  return Array.prototype.slice.call(list);
}

/**
 * Check if a given object is a react lit node
 */
export function isBrahmosNode (node) {
  return node && (node.__$isBrahmosComponent$__ || node.__$isBrahmosTag$__);
}

/**
 * Check if a given object is a BrahmosComponent
 */
export function isBrahmosComponent (node) {
  return node && node.__$isBrahmosComponent$__;
}

/**
 * Function to check if a node should be rendered as string
 */
export function isPrimitiveNode (node) {
  return typeof node === 'string' || typeof node === 'number';
}

/**
 * Function to check if node can be rendered or not
 */
export function isRenderableNode (node) {
  return isPrimitiveNode(node) || isBrahmosNode(node) || Array.isArray(node);
}

/**
 * Function to return lastItem in the list
 */
export function lastItem (list) {
  if (!Array.isArray(list)) return list;
  return list[list.length - 1];
}

/** Function to remove a list of childs from parent */
export function removeNodes (parent, childNodes) {
  for (let i = 0, ln = childNodes.length; i < ln; i++) {
    parent.removeChild(childNodes[i]);
  }
}

/**
 * Given a object/string crate a node which can be appended.
 */
function changeToNode (value) {
  if (value instanceof Node) {
    return value;
  // if it is a array of Nodes or NodList return a fragment
  } else if (Array.isArray(value) || value instanceof NodeList) {
    const fragment = document.createDocumentFragment();
    for (let i = 0, ln = value.length; i < ln; i++) {
      fragment.appendChild(value[i]);
    }
    return fragment;
  }

  // In other case it will be string so return a text node
  return document.createTextNode(value.toString());
}

/**
 * Function to delete all child nodes of a parent between start and end node
 */
export function deleteNodesBetween (parent, start, end) {
  // If both start and end is null, it means we want to clear all the children
  if (!start && !end) {
    parent.innerHTML = '';
    return;
  }

  let node;

  if (!start) {
    node = parent.firstChild;
  } else {
    node = start.nextSibling;
  }

  while (node && node !== end) {
    const { nextSibling } = node;
    parent.removeChild(node);
    node = nextSibling;
  }
}

/**
 * Function to add child nodes before endNode, if it is not defined or null
 * It will add nodes on the last
 */
export function insertBefore (parent, end = null, value) {
  const node = changeToNode(value);

  /**
   * Fragment child nodes gets cleared after its appended to dom.
   * So if it is fragment keep the reference of all childNodes as array.
   */
  const persistentNode = node instanceof DocumentFragment
    ? toArray(node.childNodes)
    : node;

  parent.insertBefore(node, end);

  return persistentNode;
}

/**
 * Get the node reference based on previousSibling, nextSibling or parentNode
 */
export function getCurrentNode (parentNode, previousSibling, nextSibling) {
  if (previousSibling) {
    return previousSibling.nextSibling;
  } else if (nextSibling) {
    return nextSibling.previousSibling;
  } else {
    return parentNode.firstChild;
  }
}

/**
 * Merge newState with old state for components
 */
export function mergeState (state, newState) {
  // if new state is not present or any falsy value, just return the state
  if (!newState) return state;

  // allow all type of objects to be spread
  // this behaviour is similar to react
  if (typeof newState === 'object') {
    state = { ...state, ...newState };
  }
  return state;
}

/**
 * Function to call life cycle of a given component, or component instance
 */
export function callLifeCycle (object, method, args) {
  if (object[method]) {
    return object[method].apply(object, args);
  }
}

/**
 * Create an empty text node before a given node
 */
export function createEmptyTextNode (element) {
  const { parentNode } = element;
  const textNode = document.createTextNode('');
  parentNode.insertBefore(textNode, element);
  return textNode;
}
