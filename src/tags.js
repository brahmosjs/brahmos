import TemplateResult from './TemplateResult';
const templateResultCache = new WeakMap();

export function html (strings, ...values) {
  const cachedTemplate = templateResultCache.get(strings);

  const template = cachedTemplate || new TemplateResult(strings);

  if (!cachedTemplate) {
    templateResultCache.set(strings, template);
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
