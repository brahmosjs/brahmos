import TemplateNode from './TemplateNode';
import functionalComponentInstance from './functionalComponentInstance';

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
} from './utils';

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
    const {
      type: Component,
      props,
      __$isBrahmosFunctionalComponent$__: isFunctionalComponent,
    } = node;

    /** If Component instance is not present on node create a new instance */
    let { componentInstance } = node;

    if (!componentInstance) {
      // create an instance of the component
      componentInstance = isFunctionalComponent
        ? functionalComponentInstance(Component)
        : new Component(props);

      /**
           * store the part information on the component instance,
           * so every component have the information of where it has to render
           */
      componentInstance.__part = part;

      // keep the reference of instance to the node.
      node.componentInstance = componentInstance;
    }

    // render nodes
    const renderNodes = componentInstance.__render(props);

    return updateNode(part, renderNodes, null, forceRender);
  } else if (node.__$isBrahmosTag$__) {
    let { templateNode, values, oldValues } = node;
    let freshRender;

    /**
       * if you don't get the old template node it means you have to render the node firts time
       * in such cases delete the nodes where the template node is supposed to be present.
       */
    if (!templateNode) {
      freshRender = true;
      templateNode = new TemplateNode(node.template);

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
  } else if (isPrimitiveNode(node) && node !== oldNode) {
    return updateTextNode(part, node, oldNode);
  }
}
