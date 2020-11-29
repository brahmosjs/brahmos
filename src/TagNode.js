// @flow
import { addDataContainer } from './utils';
import type { BrahmosNode, TagNodeType, NodePart } from './flow.types';
/**
 * Generate a similar structure as Template node from BrahmosTagElement,
 * so that it can be processed in a same way tagged template literals.
 *
 * For any tag element, there are only two parts attributes and children.
 * So create parts based on that information one for attribute and one for children node,
 * And this parts will be pointing to two values [attributes, children];
 */
export default function getTagNode(node: BrahmosNode, isSvgPart: boolean): TagNodeType {
  const { type } = node;

  const domNode = isSvgPart
    ? document.createElementNS('http://www.w3.org/2000/svg', type)
    : document.createElement(type);

  addDataContainer(domNode);

  const nodePart: NodePart = {
    previousSibling: null,
    parentNode: domNode,
    isNode: true,
  };

  return {
    fragment: [domNode],
    domNodes: [domNode],
    parts: [nodePart],
  };
}
