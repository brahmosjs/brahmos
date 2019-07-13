import updater from "./updater";
import associateInstance from "./associateInstance";

/**
 * Method to render a node
 */
export default function render(node, target) {
  const part = {
    parentNode: target,
    isNode: true
  };

  // associate instance on node using last rendered node
  associateInstance(node, target.__brahmosNode);

  // pass the context as empty object
  updater([part], [node], [], {}, true);

  // store the node reference on target
  target.__brahmosNode = node;

  return node.componentInstance;
}

/**
 * Method to rerender a given component
 */
export function reRender(component, forceUpdate = false) {
  const { __part: part, __componentNode: node, __context: context } = component;
  updater([part], [node], [], context, true, forceUpdate);
}
