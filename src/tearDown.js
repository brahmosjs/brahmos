import {
  isRenderableNode,
  deleteNodesBetween,
  callLifeCycle,
} from './utils';

function handleUnmount (node) {
  if (!isRenderableNode(node)) return;

  // if node is classComponent We may have to call componentWillUnmount lifecycle method
  if (node && node.__$isBrahmosClassComponent$__) {
    callLifeCycle(node.componentInstance, 'componentWillUnmount');
  }

  /**
   * loop over child nodes and tear it down as well
   */

  if (Array.isArray(node)) {
    for (let i = 0, ln = node.length; i < ln; i++) {
      tearDown(node[i]);
    }
  } else if (node.__$isBrahmosTag$__) {
    for (let i = 0, ln = node.values.length; i < ln; i++) {
      tearDown(node.values[i]);
    }
  } else if (node.__$isBrahmosComponent$__) {
    tearDown(node.componentInstance.__nodes);
  }
}

export default function tearDown (node, part) {
  // bail out if node is reused. It might be on different index
  if (node && node.isReused) return;

  // call componentWillUnmount Lifecycle
  handleUnmount(node);

  // if part is defined it means we need to delete all nodes on a given part
  if (part) {
    const { parentNode, previousSibling, nextSibling } = part;
    deleteNodesBetween(parentNode, previousSibling, nextSibling);
  }
}
