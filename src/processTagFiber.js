import { TAG_ELEMENT_NODE, ATTRIBUTE_NODE } from './brahmosNode';
import { linkEffect, createCurrentAndLink } from './fiber';
import getTagNode from './TagNode';
import TemplateNode from './TemplateNode';
import { loopEntries } from './utils';
import { RESERVED_ATTRIBUTES, MODIFIED_ATTRIBUTES } from './configs';

export function isAttrOverridden(tagAttrs, attrName, attrIndex) {
  const lastIndex = tagAttrs.lastIndexOf(attrName);
  // if attrIndex is before the last attribute with same name it means its overridden
  return attrIndex <= lastIndex;
}

export function attributeNode(attributes, ref) {
  return {
    nodeType: ATTRIBUTE_NODE,
    attributes,
    ref,
  };
}

export function partsToFiber(parts, values, parentFiber) {
  let refFiber = parentFiber;

  for (let i = 0, ln = parts.length; i < ln; i++) {
    let part = parts[i];
    const value = values[i];

    const { isAttribute, isNode } = part;

    let node;

    if (isAttribute) {
      const { domNode } = part;

      // mix all the consecutive attributes if they belong to same domNode
      const dynamicAttributes = {};
      let refValue;
      while (part && domNode === part.domNode) {
        loopEntries(values[i], (attrName, attrValue) => {
          const overrideAttrNameCheck = MODIFIED_ATTRIBUTES[attrName];
          const isOverridden = isAttrOverridden(
            part.tagAttrs,
            overrideAttrNameCheck,
            part.attrIndex,
          );
          if (!isOverridden && !RESERVED_ATTRIBUTES[attrName]) {
            dynamicAttributes[attrName] = attrValue;
          } else if (attrName === 'ref') {
            // Note only functional refs are supported
            refValue = attrValue;
            // TODO: Handle refs
            // setRef(attrValue, domNode);
          }
        });
        part = parts[++i];
      }

      // reduce the counter to correct the loop index. As it is extra incremented in while loop
      i--;
      part = parts[i];

      node = attributeNode(dynamicAttributes, refValue);

      // TODO: Put updateNodeAttributes as an effect
      // updateNodeAttributes(domNode, dynamicAttributes, oldDynamicAttributes, isSvgPart);
    } else if (isNode) {
      node = value;
    }

    /**
     * create a fiber from node and link it to reference fiber
     */
    refFiber = createCurrentAndLink(node, part, refFiber, parentFiber);
  }
}

/**
 * Update tagged template node
 */
export default function processTagFiber(fiber) {
  const {
    node,
    part,
    alternate,
    parent: { context },
  } = fiber;

  const oldNode = alternate && alternate.node;
  const { values, nodeType } = node;

  const isTagElement = nodeType === TAG_ELEMENT_NODE;

  // if the node is an svg element set the isSvgPart true
  // TODO: Handle svg part later
  const isSvgPart = false;

  // if new node and old node share same template we can reuse the templateNode instance
  if (oldNode && oldNode.template === node.template) {
    node.templateNode = oldNode.templateNode;
    oldNode.isReused = true;
  }

  let { templateNode } = node;

  /**
   * if you don't get the old template node it means you have to render the node first time
   * in such cases delete the nodes where the template node is supposed to be present.
   */
  if (!templateNode) {
    templateNode = isTagElement
      ? getTagNode(node, isSvgPart)
      : new TemplateNode(node.template, isSvgPart);

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
   * Associate parts to fiber.
   * No need to perform this of node and oldNode are same
   * This will only happen when we are just doing position change
   */
  if (node !== oldNode) {
    partsToFiber(templateNode.parts, values, fiber);
  }

  // mark this node to be updated or to get appended as a effect
  linkEffect(fiber);

  // attach context on fiber
  fiber.context = context;
}
