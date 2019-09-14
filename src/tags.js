import TemplateTag from './TemplateTag';
const templateTagCache = new WeakMap();

export function html (strings, ...values) {
  let template = templateTagCache.get(strings);

  if (!template) {
    template = new TemplateTag(strings);
    templateTagCache.set(strings, template);
  }

  return {
    template,
    templateNode: null,
    values,
    oldValues: [],
    isReused: false,
    added: false,
    key: '',
    __$isBrahmosTag$__: true,
  };
}
