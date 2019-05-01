import Template from 'Template';
const templateInstanceCache = new WeakMap();

export function html (strings, ...values) {
  const cachedTemplate = templateInstanceCache.get(strings);

  const template = cachedTemplate || new Template(strings);

  return function (key, ref) {
    return {
      template,
      values,
      key,
      ref,
      __$isReactLitTag$__: true,
    };
  };
}
