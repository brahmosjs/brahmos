import { attrMarker, marker } from './TemplateResult';
import { remove } from './utils';

export default class TemplateNode {
  constructor (templateResult) {
    this.templateResult = templateResult;
    this.parts = this.getParts();
  }
  createWalker (node) {
    /**
     * Only walk through elements and comment node,
     * as we add attribute markers on elements and node maker as comment
     */
    return document.createTreeWalker(
      node,
      NodeFilter.SHOW_ALL,
      function (node) {
        const { nodeType } = node;
        if (nodeType === 1 || nodeType === 8) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      },
      false
    );
  }
  getParts () {
    const { template, partsMeta } = this.templateResult;
    const node = document.importNode(template.content, true);
    const walker = this.createWalker(node);

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
      const { nodeType, parentNode, previousSibling, nextSibling, textContent } = current;
      /**
     * If its a elemt check if it has attribute marker as attribute
     * and if avialbale add the node info on the part so we can access
     * the node while updates. Also look for the consecutive parts to
     * see if they exist on same node, we make that assumption based on
     * tagAttr list. Same tag parts will shared same tagAttr list
     */
      if (nodeType === 1 && current.hasAttribute(attrMarker)) {
      // remove the attribute to keep the html clean
        current.removeAttribute(attrMarker);
        const { tagAttrs } = partMeta;
        while (
          (partMeta.isAttrValue || partMeta.isSpreadAttr) &&
        partMeta.tagAttrs === tagAttrs
        ) {
          parts.push({
            ...partMeta,
            node: current,
          });
          goToNextPart();
        }
      } else if (nodeType === 8 && textContent === marker) {
      /**
       * If the node is a node marker add previous sibling and next sibling
       * detail so later we can find the exact place where value has to come
       */
        parts.push({
          ...partMeta,
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
}
