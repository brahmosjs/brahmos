// @flow
import { TAG_ELEMENT_NODE, ATTRIBUTE_NODE } from './brahmosNode';
import { createAndLink, cloneChildrenFibers, markPendingEffect } from './fiber';
import getTagNode from './TagNode';
import TemplateNode from './TemplateNode';
import { getEffectiveAttrName, loopEntries } from './utils';
import { RESERVED_ATTRIBUTES, EFFECT_TYPE_OTHER } from './configs';

import type { Fiber, AttributePart } from './flow.types';

function isAttrOverridden(tagAttrs, attrName, attrIndex) {
  const lastIndex = tagAttrs.lastIndexOf(attrName);
  // if attrIndex is before the last attribute with same name it means its overridden
  return attrIndex <= lastIndex;
}

function attributeNode(props, ref) {
  return {
    nodeType: ATTRIBUTE_NODE,
    props,
    ref,
  };
}

function partsToFiber(parts, values, parentFiber) {
  let refFiber = parentFiber;
  let oldChildFiber = parentFiber.child;

  for (let i = 0, ln = parts.length; i < ln; i++) {
    let part = parts[i];
    const value = values[i];

    let node;

    if (part.isAttribute) {
      const { domNode } = part;

      // mix all the consecutive attributes if they belong to same domNode
      const dynamicAttributes = {};
      let refValue;
      while (part && domNode === part.domNode) {
        loopEntries(values[i], (attrName, attrValue) => {
          const attributePart = ((part: any): AttributePart);
          const effectiveAttrName = getEffectiveAttrName(attrName);
          const isOverridden = isAttrOverridden(
            attributePart.tagAttrs,
            effectiveAttrName,
            attributePart.attrIndex,
          );
          if (!isOverridden && !RESERVED_ATTRIBUTES[attrName]) {
            dynamicAttributes[attrName] = attrValue;
          } else if (attrName === 'ref') {
            // Note only functional refs are supported
            refValue = attrValue;
          }
        });
        part = parts[++i];
      }

      // reduce the counter to correct the loop index. As it is extra incremented in while loop
      i--;
      part = parts[i];

      node = attributeNode(dynamicAttributes, refValue);

      // $FlowFixMe: Not sure why flow is not able to infer this
    } else if (part.isNode) {
      node = value;
    }

    /**
     * create a fiber from node and link it to reference fiber
     */
    // get the current old fiber
    refFiber = createAndLink(node, part, oldChildFiber, refFiber, parentFiber);

    // set the next old child to oldChildFiber
    oldChildFiber = oldChildFiber && oldChildFiber.sibling;
  }
}

/**
 * Update tagged template node
 */
export default function processTagFiber(fiber: Fiber): void {
  const { node } = fiber;
  const {
    part,
    alternate,
    parent: { context },
  } = fiber;

  const oldNode = alternate && alternate.node;
  const { values, nodeType } = node;

  const isTagElement = nodeType === TAG_ELEMENT_NODE;

  // if the node is an svg element, or fiber is already mentioned as svgPart set the isSvgPart true
  const isSvgPart = fiber.isSvgPart || node.type === 'svg';

  // store isSvgPart info back to fiber, this will be forwarded to children
  fiber.isSvgPart = isSvgPart;

  let { nodeInstance } = fiber;

  if (!nodeInstance) {
    nodeInstance = isTagElement
      ? getTagNode(node, isSvgPart)
      : new TemplateNode(node.template, isSvgPart);

    // add nodeInstance to node so we can access it on next updates
    fiber.nodeInstance = nodeInstance;
  }

  /**
   * if any of nodeInstance part does not have proper parent node and its not first render
   * patch the part information using the current node's part
   * This can happen if the parent node is fragment, or it is the first or last item
   */
  if (!isTagElement) {
    // $FlowFixMe: We only patchParts in TemplateNode
    nodeInstance.patchParts(part);
  }

  /**
   * Associate parts to fiber.
   * No need to perform this if node and oldNode are same
   * This will only happen when we are just doing position change
   * In which case just clone the children fibers
   * CHECK: Will there be ever any case where node is same as oldNode
   * and process is called.
   */
  if (node !== oldNode) {
    if (isTagElement) {
      createAndLink(node.props.children, nodeInstance.parts[0], fiber.child, fiber, fiber);
    } else {
      partsToFiber(nodeInstance.parts, values, fiber);
    }
  } else {
    cloneChildrenFibers(fiber);
  }

  // mark that the fiber has uncommitted effects
  markPendingEffect(fiber, EFFECT_TYPE_OTHER);

  // attach context on fiber
  fiber.context = context;
}
