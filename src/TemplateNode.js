import { attrMarker, marker } from './TemplateTag';
import {
  remove,
  toArray,
  createEmptyTextNode,
} from './utils';

export default class TemplateNode {
  constructor (templateResult, isSvgPart) {
    this.templateResult = templateResult;

    // create the template first time the element is used
    templateResult.create(isSvgPart);

    // create dom fragment out of template
    this.fragment = this.createNode(isSvgPart);

    this.parts = this.getParts();

    // keep the reference of child nodes
    // TODO: Check if you want to use Array.from instead
    this.nodes = toArray(this.fragment.childNodes);

    this.patched = false;
  }

  createNode (isSvgPart) {
    const { template, svgTemplate } = this.templateResult;
    const templateElement = isSvgPart ? svgTemplate : template;
    return document.importNode(templateElement.content, true);
  }

  createWalker (node) {
    /**
     * Only walk through elements and comment node,
     * as we add attribute markers on elements and node maker as comment
     */
    return document.createTreeWalker(
      node,
      129, // NodeFilter.SHOW_ELEMENT + NodeFilter.COMMENT
      null, // Don't use tree walker filter function. Its painfully slow, try to find better filter code instead. You can add multiple filter type to form a number
      false
    );
  }

  isBrahmosCommentNode (node) {
    return node && node.nodeType === 8 && node.textContent === marker;
  }

  getParts () {
    const { fragment, templateResult, isBrahmosCommentNode } = this;

    const { partsMeta } = templateResult;
    const walker = this.createWalker(fragment);

    let partIndex = 0;
    let partMeta = partsMeta[partIndex];

    const parts = [];
    const markerNodes = [];

    const goToNextPart = function () {
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

      if (nodeType === 1 && current.hasAttribute(attrMarker)) {
        // remove the attribute to keep the html clean
        current.removeAttribute(attrMarker);
        const { tagAttrs } = partMeta;
        while (
          // eslint-disable-next-line no-unmodified-loop-condition
          partMeta && partMeta.isAttribute && partMeta.tagAttrs === tagAttrs
        ) {
          parts.push({
            ...partMeta, // Spread object is slow, but bublejs compiles it to Object.assign which is optimized
            node: current,
          });
          goToNextPart();
        }
      } else if (isBrahmosCommentNode(current)) {
        /**
         * If the node is a node marker add previous sibling and next sibling
         * detail so later we can find the exact place where value has to come
         */

        /**
         * Wrap the element with a text node if previous or next sibling
         * is Brahmos comment node. This makes locating dynamic part much
         * easier.
         */
        let { previousSibling, nextSibling } = current;
        if (isBrahmosCommentNode(previousSibling)) {
          previousSibling = createEmptyTextNode(current);
        }
        if (isBrahmosCommentNode(nextSibling)) {
          nextSibling = createEmptyTextNode(current);
        }

        parts.push({
          ...partMeta, // Spread object is slow, but bublejs compiles it to Object.assign which is optimized
          parentNode,
          previousSibling,
          nextSibling,
        });
        goToNextPart();

        // add the comment node to the remove list
        markerNodes.push(current);
      }
    }

    remove(markerNodes);

    return parts;
  }

  patchParts (nodePart) {
    const { parts } = this;
    const { parentNode, nextSibling, previousSibling } = nodePart;

    if (this.patched) return;

    for (let i = 0, ln = parts.length; i < ln; i++) {
      const part = parts[i];
      if (part.isNode && part.parentNode instanceof DocumentFragment) {
        part.parentNode = parentNode;
        part.nextSibling = part.nextSibling || nextSibling;
        part.previousSibling = part.previousSibling || previousSibling;
      }
    }

    this.patched = true;
  }
}
