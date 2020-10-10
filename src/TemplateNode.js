// @flow
import { BRAHMOS_PLACEHOLDER } from './configs';
import { toArray, createEmptyTextNode, addDataContainer, remove } from './utils';

import type { TemplateNodeType, TemplateTagType, Part, NodePart } from './flow.types';

function isBrahmosCommentNode(node: ?Node): boolean {
  return !!node && node.nodeType === 8 && node.textContent === BRAHMOS_PLACEHOLDER;
}

export default class TemplateNode implements TemplateNodeType {
  templateResult: TemplateTagType;

  fragment: DocumentFragment;

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

  getParts(): Array<Part> {
    const { fragment, templateResult } = this;

    const { partsMeta } = templateResult;

    const parts = [];

    // get the flattened list of elements.
    const elements = fragment.querySelectorAll('*');

    // generate part information which actual dom nodes which will be added in dom
    // eslint-disable-next-line no-unmodified-loop-condition
    for (let i = 0, ln = partsMeta.length; i < ln; i++) {
      const partMeta = partsMeta[i];
      const {
        isAttribute,
        attrIndex,
        refNodeIndex,
        prevChildIndex,
        hasExpressionSibling,
      } = partMeta;
      let refNode = elements[refNodeIndex];

      if (isAttribute) {
        // cache the tagAttribute calculate in templateTag part object, so we don't need to calculate it again.
        if (!partMeta.tagAttrs) partMeta.tagAttrs = toArray(refNode.attributes);
        parts.push({
          isAttribute: true,
          tagAttrs: partMeta.tagAttrs,
          domNode: refNode,
          attrIndex,
        });

        addDataContainer(refNode);
      } else {
        refNode = refNode || fragment;
        const hasPreviousSibling = prevChildIndex !== -1;

        let previousSibling;

        /**
         * If we get a dynamic part between two consecutive text node,
         * that gets combined as single text node when we create template element with static part.
         * For that we add an extra comment node during the compile time (babel-plugin), so they don't mix.
         * On runtime we need to check if that comment node is present, and if present remove the comment node.
         */
        const possibleCommentNode = refNode.childNodes[prevChildIndex + 1];

        if (hasPreviousSibling && isBrahmosCommentNode(possibleCommentNode)) {
          remove(possibleCommentNode);
        }

        if (!hasPreviousSibling) {
          previousSibling = null;
        } else if (hasExpressionSibling) {
          /**
           * If there are two consecutive dynamic parts, we add an empty text node,
           * So it gets easier to locate any dynamic part there.
           */
          previousSibling = createEmptyTextNode(refNode, prevChildIndex);
        } else {
          previousSibling = refNode.childNodes[prevChildIndex];
        }

        parts.push({
          isNode: true,
          parentNode: refNode,
          previousSibling,
        });
      }
    }

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
