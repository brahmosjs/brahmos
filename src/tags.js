import TemplateTag from './TemplateTag';
const templateTagCache = new WeakMap();

export function html (strings, ...values) {
  let template = templateTagCache.get(strings);

  if (!template) {
    template = new TemplateTag(strings);
    templateTagCache.set(strings, template);
  }

  return function (key, ref) {
    return {
      template,
      values,
      key,
      ref,
      __$isBrahmosTag$__: true,
    };
  };
}
