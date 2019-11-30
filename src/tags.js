import TemplateTag from './TemplateTag';
import { brahmosNode, TAG_NODE } from './brahmosNode';

const templateTagCache = new WeakMap();

export function createTagNode(template, values) {
  const node = brahmosNode(null, values, '');

  node.nodeType = TAG_NODE;
  node.template = template;

  return node;
}

export function html(strings, ...values) {
  let template = templateTagCache.get(strings);

  if (!template) {
    template = new TemplateTag(strings);
    templateTagCache.set(strings, template);
  }

  return createTagNode(template, values);
}
