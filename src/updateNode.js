import TemplateNode from './TemplateNode';
import updateComponentNode from './updateComponentNode';

import {
  isBrahmosNode,
  isPrimitiveNode,
  deleteNodesBetween,
  insertBefore,
  getCurrentNode,
  lastItem,
  toArray,
  isRenderableNode,
} from './utils';

import tearDown from './tearDown';
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
    if (oldNode !== undefined) {
      // delete the existing elements
      tearDown(oldNode, part);
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

function getOldNodeNextSibling (oldNode) {
  let lastNode;

  if (oldNode.__$isBrahmosTag$__) {
    lastNode = lastItem(oldNode.templateNode.nodes);
  } else if (oldNode.__$isBrahmosComponent$__) {
    lastNode = oldNode.componentInstance.__lastNode;
  }

  return lastNode && lastNode.nextSibling;
}

/**
 * This method removes all the unused brahmos node till it finds a
 * brahmos node on oldNodes at given index.
 * and returns the used/non brahmos node at that index
 */
function spliceUnusedNodes (index, oldNodes, parentNode, previousSibling) {
  let oldNode = oldNodes[index];
  /**
   * remove all the oldNode until we don't get a non Brahmos node or reused node,
   * We don't have to worry about non brahmos node, as they can't have key
   * and any way it will cause unnecessary rerender. And un-keyed array's are not suggested
   * Removing part of other nodes will be handled on last part of this function
   * where we delete all the overflowing nodes.
   */
  while (isBrahmosNode(oldNode) && !oldNode.isReused) {
    tearDown(oldNode, {
      parentNode,
      previousSibling,
      nextSibling: getOldNodeNextSibling(oldNode),
    });
    oldNodes.splice(index, 1);
    oldNode = oldNodes[index];
  }

  return oldNode;
}

/**
   * Updater to handle array of nodes
   */
function updateArrayNodes (part, nodes, oldNodes = [], context) {
  const { parentNode, previousSibling, nextSibling } = part;

  const nodesLength = nodes.length;
  let lastChild = previousSibling;

  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];

    // delete unused non brahmos node
    const oldNode = spliceUnusedNodes(i, oldNodes, parentNode, lastChild);
    /**
       * Pass forceUpdate as true, when newNodes and oldNodes keys are not same
       */
    const forceUpdate = !(node && oldNode && node.key === oldNode.key);

    /**
     * if lasChild is not present it means the node has to be added before the firstChild
     * Otherwise it has to added after lastChild of previous node.
     */
    const _nextSibling = lastChild ? lastChild.nextSibling : parentNode.firstChild;

    /**
     * Create a part information for array item and call the updateNode.
     * updateNode will not return last rendered child only in case where,
     * the node is non  renderable node, so in such case
     * keep lastChild as old lastChild
     */
    lastChild = updateNode({
      parentNode,
      previousSibling: lastChild,
      nextSibling: _nextSibling,
      isNode: true,
    }, node, oldNode, context, forceUpdate) || lastChild;
  }

  // teardown all extra pending old nodes
  for (let i = nodesLength, ln = oldNodes.length; i < ln; i++) {
    tearDown(oldNodes[i]);
  }

  // remove all extra nodes between lastChild and nextSibling
  deleteNodesBetween(parentNode, lastChild, nextSibling);

  return lastChild;
}

/**
 * Update tagged template node
 */
function updateTagNode (part, node, oldNode, context, forceRender) {
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
  } else {
  /**
   * if any of templateNode part does not have proper parent node and its not first render
   * patch the part information using the current node's part
   */
    templateNode.patchParts(part);
  }

  /**
   * update parts before attaching elements to dom,
   * so most of the work happens on fragment
   */
  updater(templateNode.parts, values, oldValues, context);

  if (freshRender) {
    // delete the existing elements
    tearDown(oldNode, part);

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
export default function updateNode (part, node, oldNode, context, forceRender) {
  if (!isRenderableNode(node)) {
    /**
       * If the new node is falsy value and
       * the oldNode is present we have to delete the old node
       * */
    if (oldNode !== undefined) {
      // delete the existing elements
      tearDown(oldNode, part);
    }
  } else if (Array.isArray(node)) {
    return updateArrayNodes(part, node, oldNode, context);
  } else if (node.__$isBrahmosComponent$__) {
    return updateComponentNode(part, node, oldNode, context, forceRender);
  } else if (node.__$isBrahmosTag$__) {
    return updateTagNode(part, node, oldNode, context, forceRender);
  } else if (isPrimitiveNode(node) && node !== oldNode) {
    return updateTextNode(part, node, oldNode);
  }
}
