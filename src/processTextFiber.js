import { linkEffect } from './fiber';

export function processTextFiber (fiber) {
  const { node, alternate } = fiber;
  const oldNode = alternate && alternate.node;

  // if text is different then only we should add it as an effect
  if (node !== oldNode) {
    linkEffect(fiber);
  }
}
