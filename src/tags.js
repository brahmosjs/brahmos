// @flow
import TemplateTag from './TemplateTag';
import { brahmosNode, TAG_NODE } from './brahmosNode';
import type { TemplateTagType, BrahmosNode } from './flow.types';

type TagReturn = (partMetaCode: string) => BrahmosNode;

const templateTagCache = new WeakMap();

export function createTagNode(template: TemplateTagType, values: Array<any>): BrahmosNode {
  const node = brahmosNode(null, values, undefined);

  node.nodeType = TAG_NODE;
  node.template = template;

  return node;
}

export function html(strings: Array<string>, ...values: Array<any>): TagReturn {
  return (partMetaCode) => {
    let template = templateTagCache.get(strings);

    if (!template) {
      template = new TemplateTag(strings, partMetaCode);
      templateTagCache.set(strings, template);
    }

    return createTagNode(template, values);
  };
}
