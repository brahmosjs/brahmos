// @flow
import { BRAHMOS_DATA_KEY, CAMEL_ATTRIBUTES, MODIFIED_ATTRIBUTES } from './configs';
import type {
  ObjectLiteral,
  AnyComponentInstance,
  FunctionalComponent,
  ClassComponent,
} from './flow.types';

/**
 * Method to identify if a jsx element is a html element or custom component
 * Taken from https://github.com/babel/babel/blob/master/packages/babel-types/src/validators/react/isCompatTag.js
 * */
export function isHTMLElement(tagName: string): boolean {
  // Must start with a lowercase ASCII letter
  return !!tagName && /^[a-z]/.test(tagName);
}

export function isEventAttribute(attrName: string): boolean {
  // must start with on prefix
  /**
   * Check inspired by preact.
   * Benchmark for comparison: https://esbench.com/bench/574c954bdb965b9a00965ac6
   */
  return attrName[0] === 'o' && attrName[1] === 'n';
}

// Convert React's camel-cased attributes to hypen cased.
export function getEffectiveAttrName(attrName: string): string {
  /**
   * if the attribute is camel cased for react, convert it to lower case and return it
   * Or else
   * If the attribute is an modified attribute return the html attribute.
   */
  const hyphenCasedAttribute = CAMEL_ATTRIBUTES.test(attrName)
    ? attrName.replace(/[A-Z0-9]/, '-$&').toLowerCase()
    : attrName;

  return MODIFIED_ATTRIBUTES[attrName] || hyphenCasedAttribute;
}

// get the node name from the node in lowercase format
export function getNodeName(node: HTMLElement): string {
  return node.nodeName.toLowerCase();
}

export function getEventName(attrName: string, isCaptureEvent: boolean): string {
  if (isCaptureEvent) {
    attrName = attrName.replace(/Capture$/, '');
  }
  return attrName.replace('on', '').toLowerCase();
}

export function isCustomElement(tagName: string): boolean {
  // Must match html tag check and have a hyphen in the tag name
  return isHTMLElement(tagName) && tagName.indexOf('-') !== -1;
}

// check if value is null or undefined
export function isNil(val: any): boolean {
  return val === undefined || val === null;
}

/**
 * function to return artificial time, we are using counter
 * instead of time as Date.now or performance.now is little slower than just a counter
 * Note: when we add support for SSR, we should have a way to reset the initial time to
 * not let this initialTime grow infinitely
 */
let initialTime = 0;
export function now(): number {
  return initialTime++;
}

/**
 * Function to return current timestamp
 */
export function timestamp(): number {
  return Date.now();
}

// add brahmos data container to domNode
export function addDataContainer(domNode: Node): void {
  // add brahmos data container
  // $FlowFixMe: Adding a key is intentional here
  domNode.__brahmosData = {
    events: {},
  };
}

/**
 * function to separate props, key and ref
 */
export function getNormalizedProps(props: ObjectLiteral, includeRef: boolean): ObjectLiteral {
  // if we don't have to remove anything from props no need to create a new object
  if (!('key' in props || ('ref' in props && !includeRef))) return props;

  const newProps = {};

  let key;
  for (key in props) {
    if (key !== 'key' && (key !== 'ref' || includeRef)) newProps[key] = props[key];
  }
  return newProps;
}

/**
 * Function to loop over object entries
 */
export function loopEntries(obj: ObjectLiteral, cb: (key: string, value: any) => void) {
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

export function remove(nodes: Array<Node> | Node): void {
  if (!Array.isArray(nodes)) nodes = [nodes];
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    // $FlowFixMe: remove is present on all browser except IE11
    node.remove();
  }
}

/**
 * Convert an array like object to array
 */

export function toArray(list: Iterable<any>, start: ?number) {
  start = start || 0;
  return Array.prototype.slice.call(list, start);
}

/**
 * Given a object/string crate a node which can be appended.
 */
export function changeToNode(value: Array<Node> | NodeList<Node> | Node | string): Node {
  const isNodeList = value instanceof NodeList;

  if (value instanceof Node) {
    return value;
    // if it is a array of Nodes or NodList return a fragment
  } else if (Array.isArray(value) || isNodeList) {
    const fragment = document.createDocumentFragment();

    let i = 0;

    while (value[i]) {
      // $FlowFixMe: Flow Not able to identify condition if `value instanceof NodeList` stored as value
      fragment.appendChild(value[i]);

      // no need to increment on nodeList as nodeList is spliced when elements are moved
      if (!isNodeList) i += 1;
    }
    return fragment;
  }

  // In other case it will be string so return a text node
  // $FlowFixMe: Flow Not able to identify condition if `value instanceof NodeList` stored as value
  return document.createTextNode(value);
}

/**
 * Function to add child nodes before endNode, if it is not defined or null
 * It will add nodes on the last
 */
export function insertBefore(parent: Element, end: ?Node, value: any): Array<Node> {
  const node = changeToNode(value);

  /**
   * Fragment child nodes gets cleared after its appended to dom.
   * So if it is fragment keep the reference of all childNodes as array.
   */
  let persistentNode;
  if (Array.isArray(value)) {
    // if value was already an array no need to convert document fragment to array
    persistentNode = value;
  } else if (node instanceof DocumentFragment) {
    persistentNode = toArray(node.childNodes);
  } else {
    persistentNode = value;
  }

  parent.insertBefore(node, end);

  return persistentNode;
}

// function to get next sibling based on parent node and previous sibling
export function getNextSibling(parentNode: Element, previousSibling: ?Node): ?Node {
  return previousSibling ? previousSibling.nextSibling : parentNode.firstChild;
}

/**
 * Merge newState with old state for components
 */
export function mergeState(state: ObjectLiteral, newState: any): ObjectLiteral {
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
export function callLifeCycle(object: any, method: string, args: ?Array<any>): void {
  if (object[method]) {
    return object[method].apply(object, args);
  }
}

/**
 * Create an empty text node before a given node
 */
export function createEmptyTextNode(parent: Node, index: number): ?Node {
  const nextSibling = index === 0 ? parent.firstChild : parent.childNodes[index];

  const textNode = document.createTextNode('');
  parent.insertBefore(textNode, nextSibling);
  return textNode;
}

/**
 * Put a code execution in micro task, so that it's executed after current stack
 */
export const resolvedPromise = Promise.resolve();
export function afterCurrentStack(cb: Function): Promise<void> {
  return resolvedPromise.then(cb);
}

/**
 * Function to create a unique id
 */
export function getUniqueId(): string {
  return now() + '-' + Math.random() * 1000000;
}

/**
 * Method to get a promise which support suspension of rendering
 */
export function getPromiseSuspendedValue<T>(promise: Promise<T>) {
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

/** function to check if component is mounted */
export function isMounted(component: AnyComponentInstance): boolean {
  return component[BRAHMOS_DATA_KEY].mounted;
}

/** function to get component name by its constructor */
export function getComponentName(Component: ClassComponent | FunctionalComponent): string {
  return Component.displayName || Component.name;
}

/**
 * A wrapper component which wraps the render elements
 */
export function BrahmosRootComponent({ children }: ObjectLiteral): any {
  return children;
}
