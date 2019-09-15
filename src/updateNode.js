import TemplateNode from './TemplateNode';
import updateComponentNode from './updateComponentNode';

import {
  isPrimitiveNode,
  deleteNodesBetween,
  insertBefore,
  getCurrentNode,
  lastItem,
  isRenderableNode,
} from './utils';

import { isBrahmosNode, isTagNode, isComponentNode, TAG_ELEMENT_NODE } from './brahmosNode';

import tearDown from './tearDown';
import getTagNode from './TagNode';

import updater from './updater';

/**
 * Updater to handle text node
 */
function updateTextNode (part, node, oldNode) {
  const { parentNode, previousSibling, nextSibling } = part;
  /**
   * get the last text node
   * As we always override the text node and don't change the position of
   * text node, Always send nextSibling as null to getCurrentNode
   * So we always pick the text node based on previousSibling
   * or parentNode (if prevSibling is null).
   */
  let textNode = getCurrentNode(parentNode, previousSibling, null);

  /**
     * In case of old node is not a text node or undefined, or textNode is not present
     * delete old node and add new node
     */
  if (!isPrimitiveNode(oldNode) || !textNode) {
    if (oldNode !== undefined) {
      // delete the existing elements
      tearDown(oldNode, part);
    }

    // add nodes at the right location
    textNode = insertBefore(parentNode, nextSibling, node);
  } else {
    textNode.textContent = node;
  }

  return textNode;
}

function getOldNodeNextSibling (oldNode) {
  let lastNode;

  if (isTagNode(oldNode)) {
    lastNode = lastItem(oldNode.templateNode.nodes);
  } else if (isComponentNode(oldNode)) {
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
function updateArrayNodes (part, nodes, oldNodes = [], context, isSvgPart) {
  const { parentNode, previousSibling, nextSibling } = part;

  const nodesLength = nodes.length;
  let lastChild = previousSibling;

  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];

    // delete unused non brahmos node
    const oldNode = spliceUnusedNodes(i, oldNodes, parentNode, lastChild);
    /**
       * Pass forceUpdate as all when
       * - node is primitive type as they don't have any key
       * - when newNodes and oldNodes keys are not same
       */

    const forceUpdate = (isPrimitiveNode(node) ||
    (node && oldNode && node.key !== oldNode.key)) && 'all';

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
    }, node, oldNode, context, forceUpdate, isSvgPart) || lastChild;
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
function updateTagNode (part, node, oldNode, context, forceUpdate, isSvgPart) {
  const { parentNode, previousSibling, nextSibling } = part;

  let { templateNode, values, oldValues, nodeType, element } = node;
  let freshRender;

  const isTagElement = nodeType === TAG_ELEMENT_NODE;

  // if the node is an svg element set the isSvgPart true
  isSvgPart = isSvgPart || element === 'svg';

  /**
     * if you don't get the old template node it means you have to render the node first time
     * in such cases delete the nodes where the template node is supposed to be present.
     */
  if (!templateNode) {
    freshRender = true;

    templateNode = isTagElement ? getTagNode(node, isSvgPart) : new TemplateNode(node.template, isSvgPart);

    // add templateNode to node so we can access it on next updates
    node.templateNode = templateNode;
  } else if (!isTagElement) {
  /**
   * if any of templateNode part does not have proper parent node and its not first render
   * patch the part information using the current node's part
   */
    templateNode.patchParts(part);
  }

  /**
   * update parts before attaching elements to dom,
   * so most of the work happens on fragment
   * No need to traverse down if node and oldNode is same.
   * This will only happen when we are just doing position change
   */
  if (node !== oldNode) {
    updater(templateNode.parts, values, oldValues, context, false, isSvgPart);
  }

  if (freshRender) {
    // delete the existing elements
    tearDown(oldNode, part);

    /**
     * add nodes first time
     * if we are rendering as fragment it means the fragment might have childNodes
     * which templateNode does not have, so for such cases we should reset nodeList on templateNode;
     */
    templateNode.nodes = insertBefore(parentNode, nextSibling, templateNode.fragment);
  }

  /**
     * Rearrange node if forceUpdate is set and the element is not on correct position
     */
  const firstChild = templateNode.nodes[0];
  const onCorrectPos = firstChild && firstChild.previousSibling === previousSibling;

  if (firstChild && forceUpdate && !onCorrectPos) {
    // add nodes at the right position
    insertBefore(parentNode, nextSibling, templateNode.nodes);
  }

  return lastItem(templateNode.nodes);
}

/**
   * Updater to handle any type of node
   */
export default function updateNode (part, node, oldNode, context, forceUpdate, isSvgPart) {
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
    return updateArrayNodes(part, node, oldNode, context, isSvgPart);
  } else if (isComponentNode(node)) {
    return updateComponentNode(part, node, oldNode, context, forceUpdate, isSvgPart);
  } else if (isTagNode(node)) {
    return updateTagNode(part, node, oldNode, context, forceUpdate, isSvgPart);
  } else if (isPrimitiveNode(node) && (node !== oldNode || forceUpdate)) {
    return updateTextNode(part, node, oldNode);
  }
}
