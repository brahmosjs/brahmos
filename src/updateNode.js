import TemplateNode from './TemplateNode';
import functionalComponentInstance from './functionalComponentInstance';
import { PureComponent } from './Component';

import {
  isNonZeroFalsy,
  isBrahmosNode,
  isPrimitiveNode,
  deleteNodesBetween,
  insertBefore,
  getCurrentNode,
  lastItem,
  toArray,
  removeNodes,
  mergeState,
} from './utils';

import getTagNode from './TagNode';

import updater from './updater';

/**
 * Updater to handle text node
 */
function updateTextNode (part, node, oldNode) {
  const { parentNode, previousSibling, nextSibling } = part;
  // get the last text node
  let textNode = getCurrentNode(parentNode, previousSibling, nextSibling);

  /**
     * In case of old node is not a text node, or not present
     * delete old node and add new node
     */
  if (!isPrimitiveNode(oldNode)) {
    if (oldNode) {
      // delete the existing elements
      deleteNodesBetween(parentNode, previousSibling, nextSibling);
    }

    // add nodes at the right location
    textNode = insertBefore(parentNode, nextSibling, node);
  } else {
    // just update the content of the textNode
    const textNode = getCurrentNode(parentNode, previousSibling, nextSibling);
    textNode.textContent = node;
  }

  return textNode;
}

/**
   * Updater to handle array of nodes
   */
function updateArrayNodes (part, nodes, oldNodes = []) {
  const { parentNode, previousSibling, nextSibling } = part;

  const nodesLength = nodes.length;
  let lastChild = previousSibling;

  // remove all the unused old nodes
  for (let i = 0, ln = oldNodes.length; i < ln; i++) {
    const oldNode = oldNodes[i];
    if (isBrahmosNode(oldNode) && !oldNode.isReused) {
      removeNodes(parentNode, oldNode.templateNode.nodes);
    }
  }

  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    const oldNode = oldNodes[i];
    /**
       * Pass forceUpdate as true, when newNodes and oldNodes keys are not same
       */

    const forceUpdate = !(node && oldNode && node.key === oldNode.key);

    lastChild = updateNode({
      parentNode,
      previousSibling: lastChild,
      nextSibling: lastChild && lastChild.nextSibling,
    }, node, oldNode, forceUpdate);
  }

  // remove all extra nodes between lastChild and nextSibling
  if (lastChild) deleteNodesBetween(parentNode, lastChild, nextSibling);

  return lastChild;
}

/**
 * Update component node
 */
function updateComponentNode (part, node, oldNode, forceRender) {
  const {
    type: Component,
    props,
    __$isBrahmosClassComponent$__: isClassComponent,
    __$isBrahmosFunctionalComponent$__: isFunctionalComponent,
  } = node;

  let firstRender = false;
  let shouldUpdate = true;

  /** If Component instance is not present on node create a new instance */
  let { componentInstance } = node;

  if (!componentInstance) {
    // create an instance of the component
    componentInstance = isFunctionalComponent
      ? functionalComponentInstance(Component)
      : new Component(props);

    /**
     * store the part and node information on the component instance,
     * so every component have the createElement instance of self and
     * the information of where it has to render
     */
    componentInstance.__part = part;
    componentInstance.__componentNode = node;

    // keep the reference of instance to the node.
    node.componentInstance = componentInstance;

    firstRender = true;
  }

  // call the life cycle methods for class component, which comes before rendering
  if (isClassComponent) {
    const { __unCommittedState, shouldComponentUpdate } = componentInstance;
    let state = __unCommittedState || componentInstance.state;
    // call getDerivedStateFromProps hook with the unCommitted state
    const { getDerivedStateFromProps } = Component;
    if (getDerivedStateFromProps) {
      state = mergeState(
        state,
        getDerivedStateFromProps(props, state)
      );
    }

    /**
     * check if component is instance of PureComponent, if yes then,
     * do shallow check for props and states
     */

    if (componentInstance instanceof PureComponent) {
      shouldUpdate = state !== componentInstance.state || props !== componentInstance.props;
    }

    /**
     * check if component should update or not. If PureComponent shallow check has already
     * marked component to not update then we don't have to call shouldComponentUpdate
     * Also we shouldn't call shouldComponentUpdate on first render
     */
    if (shouldComponentUpdate && shouldUpdate && !firstRender) {
      shouldUpdate = shouldComponentUpdate(props);
    }

    // set the new state and props and reset uncommitted state
    componentInstance.state = state;
    componentInstance.props = props;
    componentInstance.__unCommittedState = undefined;
  }

  // update a component update only if it can be updated based on shouldComponentUpdate
  if (shouldUpdate) {
    // render nodes
    const renderNodes = componentInstance.__render(props);

    return updateNode(part, renderNodes, null, forceRender);
  }
}

/**
 * Update tagged template node
 */
function updateTagNode (part, node, oldNode, forceRender) {
  const { parentNode, previousSibling, nextSibling } = part;

  let { templateNode, values, oldValues, __$isBrahmosTagElement$__: isTagElement } = node;
  let freshRender;

  /**
     * if you don't get the old template node it means you have to render the node first time
     * in such cases delete the nodes where the template node is supposed to be present.
     */
  if (!templateNode) {
    freshRender = true;

    templateNode = isTagElement ? getTagNode(node) : new TemplateNode(node.template);

    // add templateNode to node so we can access it on next updates
    node.templateNode = templateNode;
  }

  /**
     * update parts before attaching elements to dom,
     * so most of the work happens on fragment
     */

  updater(templateNode.parts, values, oldValues);

  if (freshRender) {
    // delete the existing elements
    deleteNodesBetween(parentNode, previousSibling, nextSibling);

    /**
     * if we are rendering fragment it means the fragment might have childNodes
     * which templateNode does not have, so for such cases we should reset nodeList on templateNode;
     */
    templateNode.nodes = toArray(templateNode.fragment.children);

    // add nodes first time
    insertBefore(parentNode, nextSibling, templateNode.fragment);
  }

  /**
     * Rearrange node if forceRender is set and the element is not on correct position
     */
  const firstChild = templateNode.nodes[0];
  const onCorrectPos = firstChild && firstChild.previousSibling === previousSibling;

  if (firstChild && forceRender && !onCorrectPos) {
    // add nodes at the right position
    insertBefore(parentNode, nextSibling, templateNode.nodes);
  }

  return lastItem(templateNode.nodes);
}

/**
   * Updater to handle any type of node
   */
export default function updateNode (part, node, oldNode, forceRender) {
  const { parentNode, previousSibling, nextSibling } = part;

  if (isNonZeroFalsy(node)) {
    /**
       * If the new node is falsy value and
       * the oldNode is present we have to delete the old node
       * */
    if (oldNode) {
      // delete the existing elements
      deleteNodesBetween(parentNode, previousSibling, nextSibling);
    }
  } else if (Array.isArray(node)) {
    return updateArrayNodes(part, node, oldNode);
  } else if (node.__$isBrahmosComponent$__) {
    return updateComponentNode(part, node, oldNode, forceRender);
  } else if (node.__$isBrahmosTag$__) {
    return updateTagNode(part, node, oldNode, forceRender);
  } else if (isPrimitiveNode(node) && node !== oldNode) {
    return updateTextNode(part, node, oldNode);
  }
}
