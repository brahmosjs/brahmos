import { omit } from './util';

export function createElement (
  element,
  configs,
  ...children
) {
  const props = omit(configs, { key: 1, ref: 1 });
  const { key, ref } = configs;
  return {
    type: element,
    props,
    key,
    ref,
    children,
    __$isReactLitComponent$__: true,
  };
}
