import {
  isComponentNode,
  isPrimitiveNode,
  isRenderableNode,
  isTagNode,
  ATTRIBUTE_NODE,
} from './brahmosNode';
import processComponentFiber from './processComponentFiber';
import { processTextFiber } from './processTextFiber';
import processTagFiber from './processTagFiber';
import effectLoop from './effectLoop';
import { linkEffect, getNextFiber, cloneWIPClone, cloneChildrenFibers, fibers } from './fiber';
import processArrayFiber from './processArrayFiber';
import tearDown from './tearDown';

const TIME_REQUIRE_TO_PROCESS_FIBER = 2;

export function processFiber(fiber) {
  const { node, root, alternate } = fiber;

  // if new node is null mark old node to tear down
  if (!isRenderableNode(node) && alternate) {
    root.tearDownFibers.push(alternate);
    return;
  }

  /**
   * If a fiber is processed and node is not dirty we clone all the children from current tree
   *
   * This will not affect the first render as fiber will never be on processed state
   * on the first render.
   */
  if (fiber.processed && !(node.componentInstance && node.componentInstance.__dirty)) {
    cloneChildrenFibers(fiber);
    return;
  }

  if (isPrimitiveNode(node)) {
    // have to write logic.
    processTextFiber(fiber);
  } else if (Array.isArray(node)) {
    processArrayFiber(fiber);
  } else if (isTagNode(node)) {
    processTagFiber(fiber);
    // TODO: Handle rearrange type of effect
  } else if (isComponentNode(node)) {
    processComponentFiber(fiber);
  } else if (node.nodeType === ATTRIBUTE_NODE) {
    linkEffect(fiber);
  }

  // after processing, mark the fiber as processed
  fiber.processed = true;
}

export default function workLoop(fiber) {
  const { root } = fiber;
  const deadline = {
    timeRemaining: () => Number.MAX_SAFE_INTEGER,
    didTimeout: false,
  };

  // root.idleCallback = requestIdleCallback((deadline) => {

  while (fiber !== root) {
    // process the current fiber which will return the next fiber
    /**
     * If there is time remaining to do some chunk of work,
     * process the current fiber, and then move to next
     * and keep doing it till we are out of time.
     */
    if (deadline.timeRemaining() >= TIME_REQUIRE_TO_PROCESS_FIBER || deadline.didTimeout) {
      processFiber(fiber);
      fiber = getNextFiber(fiber);
    } else {
      // if we are out of time schedule work for next fiber
      workLoop(fiber);

      return;
    }
  }

  // tearDown old nodes
  tearDown(root);

  // when we are done with processing all fiber run effect loop
  effectLoop(root);

  let { current } = root;

  // if previous fiber tree is not present then create a clone of wip tree
  if (!current) {
    current = cloneWIPClone(root.wip, root);
  }

  // after flushing effects swap wip and current
  root.current = root.wip;
  root.wip = current;
  // }, { timeout: 1000 });
}
