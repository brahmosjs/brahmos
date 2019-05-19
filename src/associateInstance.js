import { getKey } from './utils';

function formNodeMap (nodes) {
  const maps = {};

  for (let i = 0, ln = nodes.length; i < ln; i++) {
    const node = nodes[i];
    const key = getKey(node, i);
    maps[key] = node;
  }

  return maps;
}

export default function associateInstance (renderTree, lastRenderedTree) {
  const node = renderTree;

  /**
   * if node is not an object (tag, component), or an array of tag or component
   * no need to associate any previous instance to it.
   */
  if (typeof node !== 'object') { // this will check for  both array and object
    return;
  }

  const defaultNode = Array.isArray(node) ? [] : {};
  const oldNode = lastRenderedTree || defaultNode;

  if (Array.isArray(node)) {
    const nodes = node;
    const oldNodes = oldNode;

    const oldNodesMap = formNodeMap(oldNodes);
    for (let i = 0, ln = nodes.length; i < ln; i++) {
      const node = nodes[i];
      const key = getKey(node, i);
      const oldNode = oldNodesMap[key];
      if (oldNode) {
        associateInstance(node, oldNode);
      }
    }
  } else if (node.__$isWaspTag$__) {
    if (node.template !== oldNode.template) {
      return;
    }

    /**
     * store the already created TemplateNode instance to the new node,
     * and also store the old node values so we can compare before applying any changes
     */
    node.templateNode = oldNode.templateNode;
    node.oldValues = oldNode.values;

    /**
     * Add a flag on oldNode that it will be reused. This will help us to identify
     * oldNodes which are unused. Like for deleting all the oldNodes which are not used any more
     */
    oldNode.isReused = true;

    for (let i = 0, ln = node.values.length; i < ln; i++) {
      associateInstance(node.values[i], oldNode.values[i]);
    }
  } else if (node.__$isWaspComponent$__) {
    if (node.type !== oldNode.type) {
      return;
    }

    /**
     * store the already created component instance to the new node,
     */
    node.componentInstance = oldNode.componentInstance;

    /** Add a flag on oldNode that it will be reused */
    oldNode.isReused = true;
  }
}
