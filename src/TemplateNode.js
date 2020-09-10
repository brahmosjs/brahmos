// @flow
import { attrMarker, marker } from './TemplateTag';
import { remove, toArray, createEmptyTextNode, addDataContainer } from './utils';

import type { TemplateNodeType, TemplateTagType, Part, NodePart } from './flow.types';

export default class TemplateNode implements TemplateNodeType {
  templateResult: TemplateTagType;

  fragment: Node;

  parts: Array<Part>;

  domNodes: Array<Node>;

  patched: boolean;

  constructor(templateResult: TemplateTagType, isSvgPart: boolean) {
    this.templateResult = templateResult;

    // create the template first time the element is used
    templateResult.create(isSvgPart);

    // create dom fragment out of template
    this.fragment = this.createNode(isSvgPart);

    this.parts = this.getParts();

    // keep the reference of child nodes
    // TODO: Check if you want to use Array.from instead
    this.domNodes = toArray(this.fragment.childNodes);

    this.patched = false;
  }

  createNode(isSvgPart: boolean): DocumentFragment {
    const { template, svgTemplate } = this.templateResult;
    const templateElement = isSvgPart ? svgTemplate : template;
    // $FlowFixMe: createNode will be called only after create method call, so templateElement will always be present
    return document.importNode(templateElement.content, true);
  }

  createWalker(node: Node): TreeWalker<Node, HTMLElement | Comment> {
    /**
     * Only walk through elements and comment node,
     * as we add attribute markers on elements and node maker as comment
     */
    // $FlowFixMe: Flow error doesn't make sense the node number is correct here
    return document.createTreeWalker(
      node,
      129, // NodeFilter.SHOW_ELEMENT + NodeFilter.COMMENT
      null, // Don't use tree walker filter function. Its painfully slow, try to find better filter code instead. You can add multiple filter type to form a number
      false,
    );
  }

  isBrahmosCommentNode(node: ?Node): boolean {
    return !!node && node.nodeType === 8 && node.textContent === marker;
  }

  getParts(): Array<Part> {
    const { fragment, templateResult, isBrahmosCommentNode } = this;

    const { partsMeta } = templateResult;
    const walker = this.createWalker(fragment);

    let partIndex = 0;
    let partMeta = partsMeta[partIndex];

    const parts = [];
    const markerNodes = [];

    const goToNextPart = function() {
      partIndex++;
      partMeta = partsMeta[partIndex];
    };

    /** walk on each filtered node and see if attribute marker or comment marker is there */
    while (walker.nextNode()) {
      const current = walker.currentNode;
      const { nodeType, parentNode } = current;
      /**
       * If its a element check and if it has attribute marker as attribute
       * remove the marker and create a part with the node info to it so we
       * know which attribute that node belongs to.
       * Also look for the consecutive parts to
       * see if they exist on same node, we make that assumption based on
       * tagAttr list. Same tag parts will shared same tagAttr list
       */

      // $FlowFixMe: we are adding nodeType === 1 check so hasAttribute method will be available
      if (nodeType === 1 && current.hasAttribute(attrMarker)) {
        // remove the attribute to keep the html clean
        // $FlowFixMe: we are adding nodeType === 1 check so removeAttribute method will be available
        current.removeAttribute(attrMarker);
        const { tagAttrs } = partMeta;
        while (
          // eslint-disable-next-line no-unmodified-loop-condition
          partMeta &&
          partMeta.isAttribute &&
          partMeta.tagAttrs === tagAttrs
        ) {
          parts.push({
            ...partMeta, // Spread object is slow, but bublejs compiles it to Object.assign which is optimized
            domNode: current,
          });
          goToNextPart();
        }

        addDataContainer(current);
      } else if (isBrahmosCommentNode(current)) {
        /**
         * If the node is a node marker add previous sibling and parentNode details
         * so later we can find the exact place where value has to come
         */

        /**
         * Add a dummy text node before if the previous element is a Brahmos comment node
         * This makes locating dynamic part easier
         */
        let { previousSibling } = current;
        if (isBrahmosCommentNode(previousSibling)) {
          previousSibling = createEmptyTextNode(current);
        }

        parts.push({
          isNode: true,
          parentNode,
          previousSibling,
        });
        goToNextPart();

        // add the comment node to the remove list
        markerNodes.push(current);
      }
    }

    remove(markerNodes);

    // $FlowFixMe: parts are getting added properly based on condition, flow not able to understand nodeType
    return parts;
  }

  patchParts(nodePart: NodePart) {
    const { parts } = this;
    const { parentNode, previousSibling } = nodePart;

    if (this.patched) return;

    for (let i = 0, ln = parts.length; i < ln; i++) {
      // $FlowFixMe: We only care of NodePart and isNode check will properly check for it
      const part: NodePart = parts[i];
      if (part.isNode && part.parentNode instanceof DocumentFragment) {
        part.parentNode = parentNode;
        part.previousSibling = part.previousSibling || previousSibling;
      }
    }

    this.patched = true;
  }
}
