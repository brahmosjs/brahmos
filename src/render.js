
import updater from './updater';

/**
 * Method to render a node
 */
export default function render (node, target) {
  const part = {
    parentNode: target,
    isNode: true,
  };
  // pass the context as empty object
  updater([part], [node], [], {}, true);
}

/**
 * Method to rerender a given component
 */
export function reRender (component) {
  const { __part: part, __componentNode: node, __context: context } = component;
  updater([part], [node], [], context, true);
}
