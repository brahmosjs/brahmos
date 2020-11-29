// @flow

import {
  isComponentNode,
  isPrimitiveNode,
  ATTRIBUTE_NODE,
  isTagElementNode,
  isHtmlTagNode,
} from './brahmosNode';
import {
  UPDATE_TYPE_DEFERRED,
  BRAHMOS_DATA_KEY,
  EFFECT_TYPE_NONE,
  UPDATE_TYPE_SYNC,
  UPDATE_SOURCE_DEFAULT,
} from './configs';
import { now, isNil } from './utils';

import type {
  Fiber,
  HostFiber,
  BrahmosNode,
  Part,
  UpdateType,
  EffectType,
  AnyComponentInstance,
  ExtendedElement,
} from './flow.types';

let currentComponentFiber;

export function setCurrentComponentFiber(fiber: ?Fiber) {
  currentComponentFiber = fiber;
}

export function getCurrentComponentFiber(): Fiber {
  // $FlowFixMe: Get current component is always called during render, where it will be present
  return currentComponentFiber;
}

export function getLastCompleteTimeKey(
  type: string,
): 'lastDeferredCompleteTime' | 'lastCompleteTime' {
  return type === UPDATE_TYPE_DEFERRED ? 'lastDeferredCompleteTime' : 'lastCompleteTime';
}

export function getUpdateTimeKey(type: string): 'deferredUpdateTime' | 'updateTime' {
  return type === UPDATE_TYPE_DEFERRED ? 'deferredUpdateTime' : 'updateTime';
}

export function setUpdateTime(fiber: Fiber, type: UpdateType) {
  const key = getUpdateTimeKey(type);
  const time = now();

  while (fiber) {
    fiber[key] = time;
    fiber = fiber.parent;
  }
}

// link the new fiber to its parent or it's previous sibling
function linkFiber(fiber, refFiber, parentFiber) {
  if (refFiber === parentFiber) {
    parentFiber.child = fiber;
  } else {
    refFiber.sibling = fiber;
  }

  fiber.parent = parentFiber;
}

// function to mark pending effects on the fiber and root
export function markPendingEffect(fiber: Fiber, effectType: EffectType) {
  fiber.hasUncommittedEffect = effectType;
  fiber.root.hasUncommittedEffect = true;
}

export function cloneCurrentFiber(
  fiber: Fiber,
  wipFiber: ?Fiber,
  refFiber: Fiber,
  parentFiber: Fiber,
): Fiber {
  const { root, node, part, nodeInstance, child } = fiber;
  const updateTimeKey = getUpdateTimeKey(root.updateType);

  if (!wipFiber) {
    wipFiber = createFiber(root, node, part);
    // add fibers as each others alternate
    addAlternates(fiber, wipFiber);
  } else {
    wipFiber.node = node;
    wipFiber.part = part;

    /**
     * As the cloned node is treated as new fiber, reset the createdAt time
     */
    wipFiber.createdAt = now();
  }

  /**
   * When we are cloning a fiber we should prevent the fiber to tear down
   * A fiber can be marked for tearDown but after suspend (through suspense) / or error boundaries
   * it can be used again making the tear down stale.
   */
  fiber.shouldTearDown = false;

  // add the nodeInstance to cloned fiber
  wipFiber.nodeInstance = nodeInstance;

  /**
   * Add the current child to wipFiber.
   * This is required so that new fiber is pointing to the existing child fiber
   * Note: We don't need to copy sibling as it will be set by loop, from where ever
   * the cloneMethod is called.
   * So make sure clone method is not called for only a single child if there multiple child.
   * */
  wipFiber.child = child;

  /**
   * We should add update times from parent fiber.
   */
  wipFiber[updateTimeKey] = parentFiber[updateTimeKey];

  // link the new fiber to its parent or it's previous sibling
  linkFiber(wipFiber, refFiber, parentFiber);

  return wipFiber;
}

export function getNextChildFiber(refFiber: Fiber, parentFiber: Fiber): ?Fiber {
  return refFiber === parentFiber ? refFiber.child : refFiber.sibling;
}

export function cloneChildrenFibers(fiber: Fiber): void {
  let { child, root } = fiber;

  /**
   * No need to clone children if the updateType is sync,
   */
  if (root.updateType === UPDATE_TYPE_SYNC) {
    return;
  }

  let lastChild;

  while (child) {
    /**
     * use the alternate node as wip node, as its no longer used by current node,
     * so we can reuse the object instead of creating a new one.
     * If it doesn't have any alternate node it means this is a new node,
     * so need to create them again
     */
    const { alternate } = child;

    lastChild = cloneCurrentFiber(child, alternate, lastChild || fiber, fiber);

    child = child.sibling;
  }
}

export function createHostFiber(domNode: ExtendedElement): HostFiber {
  let afterRenderCallbacks = [];

  return {
    updateType: UPDATE_TYPE_DEFERRED,
    updateSource: UPDATE_SOURCE_DEFAULT,
    cancelSchedule: null,
    domNode,
    forcedUpdateWith: null,
    // $FlowFixMe: Current will be set as soon after we create host fiber
    current: null,
    wip: null,
    child: null,
    retryFiber: null,
    currentTransition: null,
    hasUncommittedEffect: false,
    pendingTransitions: [],
    tearDownFibers: [],
    postCommitEffects: [],
    batchUpdates: {},
    lastDeferredCompleteTime: 0,
    lastCompleteTime: 0,
    deferredUpdateTime: 0,
    updateTime: 0,

    /** After render utils */
    afterRender(cb) {
      // if the callback is not already added add the callback
      if (!afterRenderCallbacks.includes(cb)) {
        afterRenderCallbacks.push(cb);
      }
    },
    callRenderCallbacks() {
      for (let i = 0, ln = afterRenderCallbacks.length; i < ln; i++) {
        afterRenderCallbacks[i]();
      }
    },
    resetRenderCallbacks() {
      afterRenderCallbacks = [];
    },
  };
}

export function createFiber(root: HostFiber, node: BrahmosNode, part: Part): Fiber {
  // if a node is ported node, update the part information
  if (node && node.portalContainer) {
    // $FlowFixMe: If node has portal container, the fiber part has to be ArrayPart or NodePart
    part.parentNode = node.portalContainer;
  }

  return {
    node,
    nodeInstance: null,
    root,
    // $FlowFixMe: We always link fiber with its parent, so after creating parent will always be set
    parent: null,
    child: null,
    sibling: null,
    part,
    alternate: null, // points to the current fiber
    context: null, // Points to the context applicable for that fiber
    childFiberError: null,
    isSvgPart: false,
    deferredUpdateTime: 0,
    updateTime: 0,
    processedTime: 0, // processedTime 0 signifies it needs processing
    createdAt: now(),
    shouldTearDown: false,
    hasUncommittedEffect: EFFECT_TYPE_NONE,
  };
}

/**
 * add to fibers as alternate to each other
 */
export function addAlternates(current: Fiber, wip: Fiber): void {
  if (current) {
    current.alternate = wip;
  }
  wip.alternate = current;
}

export function createAndLink(
  node: any,
  part: Part,
  currentFiber: ?Fiber,
  refFiber: Fiber,
  parentFiber: Fiber,
): Fiber {
  const { root } = refFiber;
  const updateTimeKey = getUpdateTimeKey(root.updateType);
  let fiber;
  if (
    currentFiber &&
    !isNil(currentFiber.node) &&
    !isNil(node) &&
    shouldClone(node, currentFiber.node)
  ) {
    fiber = cloneCurrentFiber(currentFiber, currentFiber.alternate, refFiber, parentFiber);

    // assign new node and part to the fiber
    fiber.node = node;
    fiber.part = part;
  } else {
    fiber = createFiber(root, node, part);

    // if current fiber is there mark it to tear down
    if (currentFiber) {
      markToTearDown(currentFiber);
    }
  }

  linkFiber(fiber, refFiber, parentFiber);

  fiber.processedTime = 0;

  // add parent's inheriting property to children
  fiber[updateTimeKey] = parentFiber[updateTimeKey];
  fiber.context = parentFiber.context;
  fiber.isSvgPart = parentFiber.isSvgPart;

  return fiber;
}

function shouldClone(newNode: any, oldNode: any): boolean {
  return (
    // if it is primitive node and old node is also primitive we can clone the previous fiber
    (isPrimitiveNode(newNode) && isPrimitiveNode(oldNode)) ||
    /**
     * if the new node is attribute node, no need to check for old node as the
     * if there is oldNode it will always be same type in case of attribute node
     */
    newNode.nodeType === ATTRIBUTE_NODE ||
    // if both are array type than clone
    (Array.isArray(newNode) && Array.isArray(oldNode)) ||
    // if it is component node or tag element node and node type matches with oldNode's type we should clone the current
    ((isComponentNode(newNode) || isTagElementNode(newNode)) && newNode.type === oldNode.type) ||
    // if it is tag node and node's template matches with oldNode's template we should clone the current
    (isHtmlTagNode(newNode) && newNode.template === oldNode.template)
  );
}

function needProcessing(fiber, lastCompleteTime, updateTimeKey) {
  return fiber && fiber[updateTimeKey] >= lastCompleteTime;
}

function getFiberWhichRequiresProcessing(fiber, lastCompleteTime, updateTimeKey) {
  if (!fiber) return;

  // keep looping till we find a child which needs processing
  while (fiber && !needProcessing(fiber, lastCompleteTime, updateTimeKey)) fiber = fiber.sibling;

  return fiber;
}

export function getNextFiber(
  fiber: Fiber,
  topFiber: Fiber | HostFiber,
  lastCompleteTime: number,
  updateTimeKey: string,
): Fiber {
  /**
   * Skip fibers which does not require processing
   */
  // if there is a child which required processing return that child
  const child = getFiberWhichRequiresProcessing(fiber.child, lastCompleteTime, updateTimeKey);
  if (child) return child;

  let sibling;

  // or else return the sibling or the next uncle which requires processing
  while (
    !(sibling = getFiberWhichRequiresProcessing(fiber.sibling, lastCompleteTime, updateTimeKey))
  ) {
    // go to fiber parents
    fiber = fiber.parent;

    // if the parent fiber is topFiber, no further processing is required, so return that
    if (fiber === topFiber) return fiber;
  }

  // return fiber's sibling
  return sibling;
}

/** Function to get fiber from the component */
export function getFiberFromComponent(component: AnyComponentInstance): Fiber {
  /**
   * $FlowFixMe: Component will always fiber once its rendered, so we can assume fiber is not null here
   * And this method is always called after component is mounted once
   */
  return component[BRAHMOS_DATA_KEY].fiber;
}

/**
 * Function to reset child to committed fiber.
 * This is a usual case when we interrupt workLoop, the fiber might be pointing to
 * the wrong uncommitted fiber, in which case we reset it to the alternate
 * (which points to the committed one)
 */
export function resetToCommittedChild(fiber: Fiber): void {
  const { root, child } = fiber;
  /**
   * if the child fiber is created but not committed yet,
   * reset the child fiber to alternate child
   */
  if (child && child.createdAt > root.lastCompleteTime) {
    fiber.child = child.alternate;
  }
}

/**
 * function to push a fiber for tearDown
 */
export function markToTearDown(fiber: Fiber): void {
  fiber.shouldTearDown = true;
  fiber.root.tearDownFibers.push(fiber);
}
