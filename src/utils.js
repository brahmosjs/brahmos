/**
 * Method to identify if a jsx element is a html element or custom component
 * Taken from https://github.com/babel/babel/blob/master/packages/babel-types/src/validators/react/isCompatTag.js
 * */
export function isHTMLElement(tagName) {
  // Must start with a lowercase ASCII letter
  return !!tagName && /^[a-z]/.test(tagName);
}

export function isEventAttribute(attrName) {
  // must start with on prefix
  // used indexOf for cross browser support
  return attrName.indexOf('on') === 0;
}

// get the node name from the node in lowercase format
export function getNodeName(node) {
  return node.nodeName.toLowerCase();
}

export function getEventName(attrName) {
  return attrName.replace('on', '').toLowerCase();
}

export function isCustomElement(tagName) {
  // Must match html tag check and have a hyphen in the tag name
  return isHTMLElement(tagName) && tagName.indexOf('-') !== -1;
}

// check if value is null or undefined
export function isNil(val) {
  return val === undefined || val === null;
}

/**
 * function to return artificial time, we are using counter
 * instead of time as Date.now or performance.now is little slower than just a counter
 * Note: when we add support for SSR, we should have a way to reset the initial time to
 * not let this initialTime grow infinitely
 */
let initialTime = 0;
export function now() {
  return initialTime++;
}

// add brahmos data container to domNode
export function addDataContainer(domNode) {
  // add brahmos data container
  domNode.__brahmosData = {
    events: {},
  };
}

/**
 * function to separate props, key and ref
 */
export function getNormalizedProps(props, includeRef) {
  const newObj = {};
  let key;
  for (key in props) {
    if (key !== 'key' && (key !== 'ref' || includeRef)) newObj[key] = props[key];
  }
  return newObj;
}

/**
 * Function to loop over object entries
 */
export function loopEntries(obj, cb) {
  const keys = Object.keys(obj);

  for (let i = 0, ln = keys.length; i < ln; i++) {
    const key = keys[i];
    const value = obj[key];
    cb(key, value);
  }
}

/**
 * Remove nodes from parent
 */

export function remove(nodes) {
  if (!Array.isArray(nodes)) nodes = [nodes];
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    node.parentNode.removeChild(node);
  }
}

/**
 * Convert an array like object to array
 */

export function toArray(list) {
  return Array.prototype.slice.call(list);
}

/**
 * Function to return lastItem in the list
 */
export function lastItem(list) {
  if (!Array.isArray(list)) return list;
  return list[list.length - 1];
}

/**
 * Given a object/string crate a node which can be appended.
 */
export function changeToNode(value) {
  const isNodeList = value instanceof NodeList;

  if (value instanceof Node) {
    return value;
    // if it is a array of Nodes or NodList return a fragment
  } else if (Array.isArray(value) || isNodeList) {
    const fragment = document.createDocumentFragment();

    let i = 0;

    while (value[i]) {
      fragment.appendChild(value[i]);

      // no need to increment on nodeList as nodeList is spliced when elements are moved
      if (!isNodeList) i += 1;
    }
    return fragment;
  }

  // In other case it will be string so return a text node
  return document.createTextNode(value);
}

/**
 * Function to add child nodes before endNode, if it is not defined or null
 * It will add nodes on the last
 */
export function insertBefore(parent, end, value) {
  end = end === undefined ? null : end;
  const node = changeToNode(value);

  /**
   * Fragment child nodes gets cleared after its appended to dom.
   * So if it is fragment keep the reference of all childNodes as array.
   */
  const persistentNode = node instanceof DocumentFragment ? toArray(node.childNodes) : node;

  parent.insertBefore(node, end);

  return persistentNode;
}

/**
 * Function to unwrap children from its parent
 */
export function unwrap(el) {
  // get the element's parent node
  var parent = el.parentNode;

  // move all children out of the element
  while (el.firstChild) parent.insertBefore(el.firstChild, el);

  // remove the empty element
  parent.removeChild(el);
}

/**
 * Get the node reference based on previousSibling, nextSibling or parentNode
 */
export function getCurrentNode(parentNode, previousSibling, nextSibling) {
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
export function mergeState(state, newState) {
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
export function callLifeCycle(object, method, args) {
  if (object[method]) {
    return object[method].apply(object, args);
  }
}

/**
 * Create an empty text node before a given node
 */
export function createEmptyTextNode(element) {
  const { parentNode } = element;
  const textNode = document.createTextNode('');
  parentNode.insertBefore(textNode, element);
  return textNode;
}

/**
 * Put a code execution in micro task, so that it's executed after current stack
 */
const resolvedPromise = Promise.resolve();
export function afterCurrentStack(cb) {
  return resolvedPromise.then(cb);
}

/**
 * Function to create a unique id
 */

export function getUniqueId() {
  return now() + '-' + Math.random() * 1000000;
}

/**
 * Method to get a promise which support suspension of rendering
 */
export function getPromiseSuspendedValue(promise) {
  let status = 'pending';
  let result;
  const suspender = promise.then(
    (r) => {
      status = 'success';
      result = r;
    },
    (e) => {
      status = 'error';
      result = e;
    },
  );
  return {
    read() {
      if (status === 'pending') {
        throw suspender;
      } else if (status === 'error') {
        throw result;
      } else if (status === 'success') {
        return result;
      }
    },
  };
}
