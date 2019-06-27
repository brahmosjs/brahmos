import TemplateTag from './TemplateTag';
const templateTagCache = new WeakMap();

export function html (strings, ...values) {
  let template = templateTagCache.get(strings);

  if (!template) {
    template = new TemplateTag(strings);
    templateTagCache.set(strings, template);
  }

  return function () {
    return {
      template,
      values,
      __$isBrahmosTag$__: true,
    };
  };
}
