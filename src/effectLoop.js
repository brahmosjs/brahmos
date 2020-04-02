import { isTagNode, isComponentNode, isPrimitiveNode, ATTRIBUTE_NODE } from './brahmosNode';

import {
  insertBefore,
  getCurrentNode,
} from './utils';
import updateNodeAttributes from './updateAttribute';

/**
 * Updater to handle text node
 */
function updateTextNode (fiber) {
  const { part, node } = fiber;
  const { parentNode, previousSibling, nextSibling } = part;
  /**
   * get the last text node
   * As we always override the text node and don't change the position of
   * text node, Always send nextSibling as null to getCurrentNode
   * So we always pick the text node based on previousSibling
   * or parentNode (if prevSibling is null).
   */
  let textNode = getCurrentNode(parentNode, previousSibling, null);

  if (!textNode) {
    // add nodes at the right location
    textNode = insertBefore(parentNode, nextSibling, node);
  } else {
    // if we have text node just update the text node
    textNode.textContent = node;
  }

  return textNode;
}

function updateTagNode (fiber) {
  const { part, node: { templateNode } } = fiber;
  const { parentNode, nextSibling } = part;

  // append child

  /**
   * when we add nodes first time
   * and we are rendering as fragment it means the fragment might have childNodes
   * which templateNode does not have, so for such cases we should reset nodeList on templateNode;
   */
  templateNode.domNodes = insertBefore(parentNode, nextSibling, templateNode.fragment);

  // TODO: Handle rearrange type of effect
}

function handleComponentEffect (fiber) {

}

function handleAttributeEffect (fiber) {
  const { part, node, alternate } = fiber;
  const { domNode } = part;
  const { attributes } = node;
  const oldAttributes = alternate && alternate.node.attributes;

  // TODO: Fix svg case
  updateNodeAttributes(domNode, attributes, oldAttributes, false);
}

export default function effectLoop (root) {
  let { nextEffect: fiber } = root;
  while (fiber) {
    const { node } = fiber;
    if (isPrimitiveNode(node)) {
      updateTextNode(fiber);
    } else if (isTagNode(node)) {
      updateTagNode(fiber);
      // TODO: Handle rearrange type of effect
    } else if (isComponentNode(node)) {
      handleComponentEffect(fiber);
    } else if (node.nodeType === ATTRIBUTE_NODE) {
      handleAttributeEffect(fiber);
    }

    fiber = fiber.nextEffect;
  }

  // once all effect has been processed update root's last effect node
  root.lastEffectFiber = root;
}
