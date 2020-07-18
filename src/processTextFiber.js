import { markPendingEffect } from './fiber';

export function processTextFiber(fiber) {
  const { node, alternate } = fiber;
  const oldNode = alternate && alternate.node;

  // if text is different then only we should add it as an effect
  if (node !== oldNode) {
    // mark that the fiber has uncommitted effects
    markPendingEffect(fiber);
  }
}
