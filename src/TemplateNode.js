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

    const elements = fragment.querySelectorAll('*');

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

        const possibleCommentNode = refNode.childNodes[prevChildIndex + 1];

        if (hasPreviousSibling && isBrahmosCommentNode(possibleCommentNode)) {
          remove(possibleCommentNode);
        }

        if (!hasPreviousSibling) {
          previousSibling = null;
        } else if (hasExpressionSibling) {
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
