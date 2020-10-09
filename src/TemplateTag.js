// @flow
import type { PartMeta, TemplateTagType } from './flow.types';

function decodePartMeta(partMetaCode: string): Array<PartMeta> {
  const parts = partMetaCode.split(',');
  return parts.map((partCodeStr) => {
    const [flagCode, primaryIndex, secondaryIndex] = partCodeStr.split('|');
    const isAttribute = flagCode === '0';
    const hasExpressionSibling = flagCode === '2';

    return {
      isAttribute,
      refNodeIndex: primaryIndex ? Number(primaryIndex) : -1,
      attrIndex: isAttribute ? Number(secondaryIndex) : -1,
      prevChildIndex: !isAttribute && secondaryIndex ? Number(secondaryIndex) : -1,
      hasExpressionSibling,
      tagAttrs: undefined,
    };
  });
}

export default class TemplateTag implements TemplateTagType {
  $key: 'svgTemplate' | 'template';

  $value: ?HTMLTemplateElement;

  strings: Array<string>;

  template: ?HTMLTemplateElement;

  svgTemplate: ?HTMLTemplateElement;

  partsMeta: Array<PartMeta>;

  partMetaCode: string;

  constructor(strings: Array<string>, partMetaCode: string) {
    this.strings = strings;
    this.template = null;
    this.svgTemplate = null;
    this.partsMeta = [];
    this.partMetaCode = partMetaCode;
  }

  create(isSvgPart: boolean) {
    if (isSvgPart && this.svgTemplate) return;

    if (this.template) return;

    if (!this.partsMeta.length) {
      this.partsMeta = decodePartMeta(this.partMetaCode);
    }

    this.createTemplate(isSvgPart);
  }

  createTemplate(isSvgPart: boolean) {
    const { strings } = this;
    const template = document.createElement('template');

    const htmlStr = strings.join('');

    /**
     * if its svg child wrap it inside svg
     * so that inner elements are parsed in svg context
     * Or else add the htmlStr directly
     */
    template.innerHTML = isSvgPart ? `<svg>${htmlStr}</svg>` : htmlStr;

    /**
     * Once added to template unwrap the element from svg wrap
     */
    if (isSvgPart) {
      const { content } = template;

      // $FlowFixMe: In this case there will always have a wrap.
      const svgWrap: SVGElement = content.firstChild;

      // move all children out of the element
      while (svgWrap.firstChild) content.insertBefore(svgWrap.firstChild, svgWrap);

      // remove the empty element
      content.removeChild(svgWrap);
    }

    const templateKey = isSvgPart ? 'svgTemplate' : 'template';

    this[templateKey] = template;
  }
}
