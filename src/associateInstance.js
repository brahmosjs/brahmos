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
  } else if (node.__$isReactLitTag$__) {
    if (node.template !== oldNode.template) {
      return;
    }

    node.templateNode = oldNode.templateNode;

    for (let i = 0, ln = node.expressions.length; i < ln; i++) {
      associateInstance(node.expressions[i], oldNode.templateNode[i]);
    }
  } else if (node.__$isReactLitComponent$__) {
    if (node.type !== oldNode.type) {
      return;
    }

    node.componentInstance = oldNode.componentInstance;
  }
}
