/**
 * Generate a similar structure as Template node from BrahmosTagElement,
 * so that it can be processed in a same way tagged template literals.
 *
 * For any tag element, there are only two parts attributes and children.
 * So create parts based on that information one for attribute and one for children node,
 * And this parts will be pointing to two values [attributes, children];
 */

export default function getTagNode (node, isSvgPart) {
  const { element, values } = node;

  const domElement = isSvgPart ?
    document.createElementNS('http://www.w3.org/2000/svg', element) :
    document.createElement(element);

  const attributePart = {
    isAttribute: true,
    tagAttrs: [],
    attrIndex: 0,
    node: domElement,
  };

  const nodePart = {
    parentNode: domElement,
    isNode: true,
  };

  return {
    fragment: domElement,
    nodes: [domElement],
    parts: [attributePart, nodePart],
    values,
  };
}
