// @flow
import { addDataContainer } from './utils';
import type { BrahmosNode, TagNodeType, AttributePart, NodePart } from './flow.types';
/**
 * Generate a similar structure as Template node from BrahmosTagElement,
 * so that it can be processed in a same way tagged template literals.
 *
 * For any tag element, there are only two parts attributes and children.
 * So create parts based on that information one for attribute and one for children node,
 * And this parts will be pointing to two values [attributes, children];
 */

export default function getTagNode(node: BrahmosNode, isSvgPart: boolean): TagNodeType {
  const { element } = node;

  const domElement = isSvgPart
    ? document.createElementNS('http://www.w3.org/2000/svg', element)
    : document.createElement(element);

  addDataContainer(domElement);

  const attributePart: AttributePart = {
    isAttribute: true,
    tagAttrs: [],
    attrIndex: 0,
    domNode: domElement,
  };

  const nodePart: NodePart = {
    previousSibling: null,
    parentNode: domElement,
    isNode: true,
  };

  return {
    fragment: domElement,
    domNodes: [domElement],
    parts: [attributePart, nodePart],
  };
}
