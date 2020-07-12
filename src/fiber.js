import { isComponentNode, isTagNode, isPrimitiveNode, ATTRIBUTE_NODE } from './brahmosNode';
import { UPDATE_TYPE_DEFERRED, BRAHMOS_DATA_KEY } from './configs';

export const fibers = {
  workInProgress: null,
  current: null,
  currentFiber: null,
};

let currentFiber;

export function setCurrentFiber(fiber) {
  currentFiber = fiber;
}

export function getCurrentFiber() {
  return currentFiber;
}

export function getLastCompleteTimeKey(type) {
  return type === UPDATE_TYPE_DEFERRED ? 'lastDeferredCompleteTime' : 'lastCompleteTime';
}

export function getUpdateTimeKey(type) {
  return type === UPDATE_TYPE_DEFERRED ? 'deferredUpdateTime' : 'updateTime';
}

export function getCurrentTreeFiber(componentFiber, type) {
  const { wip } = componentFiber.root;
  let fiber = componentFiber;

  while (fiber) {
    // fiber is from wip tree return the alternate of the fiber
    if (fiber === wip) {
      return componentFiber.alternate;
    }

    fiber = fiber.parent;
  }

  return componentFiber;
}

export function setUpdateTime(fiber, type) {
  const key = getUpdateTimeKey(type);
  const time = performance.now();

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

export function cloneCurrentFiber(fiber, wipFiber, refFiber, parentFiber) {
  const { node, part, child, deferredUpdateTime } = fiber;

  if (!wipFiber) {
    wipFiber = createFiber(fiber.root, node, part);
    // add fibers as each others alternate
    addAlternates(fiber, wipFiber);
  } else {
    wipFiber.node = node;
    wipFiber.part = part;

    /**
     * reset the nextEffect prop from the wipFiber, when we are reusing wipFiber.
     * alternate might have nextEffect prop intact if the wip tree was process but
     * wasn't committed
     */
    wipFiber.nextEffect = null;
    /**
     * As the cloned node is treated as new fiber, reset the createdAt time
     */
    wipFiber.createdAt = performance.now();
  }

  /**
   * Add the current child to wipFiber.
   * This is required so that new fiber is pointing to the existing child fiber
   * Note: We don't need to copy sibling as it will be set by loop, from where ever
   * the cloneMethod is called.
   * So make sure clone method is not called for only a single child if there multiple child.
   * */
  wipFiber.child = child;

  /**
   * We should add deferred update times from current fiber.
   * We don't need to add updateTime as in sync mode cloneCurrentFiber called only
   * when a new fiber is created, in which case it will get the time from its parent
   * and the other case is when we clone current to deferred tree,
   * in which case we should add the deferredUpdateTime from the current fiber.
   */
  wipFiber.deferredUpdateTime = deferredUpdateTime;

  // link the new fiber to its parent or it's previous sibling
  linkFiber(wipFiber, refFiber, parentFiber);

  return wipFiber;
}

export function getNextChildFiber(refFiber, parentFiber) {
  return refFiber === parentFiber ? refFiber.child : refFiber.sibling;
}

export function cloneChildrenFibers(fiber) {
  let { child, root } = fiber;

  /**
   * No need to clone children if the updateType is sync,
   */
  if (root.updateType === 'sync') {
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

export function createHostFiber(domNode) {
  let afterRenderCallbacks = [];

  const rootFiber = {
    domNode,
    idleCallback: null,
    current: null,
    wip: null,
    lastEffectFiber: null,
    lastSuspenseFiber: null,
    preventSchedule: false,
    currentTransition: null,
    pendingTransitions: [],
    tearDownFibers: [],
    postCommitEffects: [],
    batchUpdates: {},
    nextEffect: null,
    alternate: null,
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

  // check if this has any performance hit
  rootFiber.lastEffectFiber = rootFiber;

  return rootFiber;
}

export function createFiber(root, node, part) {
  return {
    node,
    root,
    parent: null,
    child: null,
    sibling: null,
    part,
    alternate: null, // points to the current fiber
    context: null, // Points to the context applicable for that fiber
    errorBoundary: null,
    isSvgPart: false,
    nextEffect: null,
    deferredUpdateTime: 0,
    updateTime: 0,
    processedTime: 0, // processedTime 0 signifies it needs processing
    createdAt: performance.now(),
  };
}

/**
 * link fibers with effect
 */
export function linkEffect(fiber) {
  const { root } = fiber;
  // to the last effect fiber link the fiber as next effect
  root.lastEffectFiber.nextEffect = fiber;

  // store fiber as last fiber with effect
  root.lastEffectFiber = fiber;
}

/**
 * add to fibers as alternate to each other
 */
export function addAlternates(current, wip) {
  if (current) {
    current.alternate = wip;
  }
  wip.alternate = current;
}

export function createAndLink(node, part, currentFiber, refFiber, parentFiber) {
  const { root } = refFiber;
  const updateTimeKey = getUpdateTimeKey(root.updateType);
  let fiber;
  if (currentFiber && currentFiber.node && node && shouldClone(node, currentFiber.node)) {
    fiber = cloneCurrentFiber(currentFiber, currentFiber.alternate, refFiber, parentFiber);

    // assign new node and part to the fiber
    fiber.node = node;
    fiber.part = part;
  } else {
    fiber = createFiber(root, node, part);

    // if current fiber is there mark it to tear down
    if (currentFiber) {
      root.tearDownFibers.push(currentFiber);
    }
  }

  linkFiber(fiber, refFiber, parentFiber);

  fiber.processedTime = 0;

  // add parent's inheriting property to children
  fiber[updateTimeKey] = parentFiber[updateTimeKey];
  fiber.context = parentFiber.context;
  fiber.isSvgPart = parentFiber.isSvgPart;
  fiber.errorBoundary = parentFiber.errorBoundary;

  return fiber;
}

function shouldClone(newNode, oldNode) {
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
    // if it is component node and node type matches with oldNode's type we should clone the current
    (isComponentNode(newNode) && newNode.type === oldNode.type) ||
    // if it is tag node and node's template matches with oldNode's template we should clone the current
    (isTagNode(newNode) && newNode.template === oldNode.template)
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

export function getNextFiber(fiber, topFiber, lastCompleteTime, updateTimeKey) {
  // if we have any retry fiber reset return that fiber
  const { root } = fiber;
  const { retryFiber } = root;
  if (retryFiber) {
    // reset the retry fiber and return it
    root.retryFiber = null;
    return retryFiber;
  }

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
export function getFiberFromComponent(component) {
  return component[BRAHMOS_DATA_KEY].fiber;
}

/**
 * Function to reset child to committed fiber.
 * This is a usual case when we interrupt workLoop, the fiber might be pointing to
 * the wrong uncommitted fiber, in which case we reset it to the alternate
 * (which points to the committed one)
 */
export function resetToCommittedChild(fiber) {
  const { root, child, alternate } = fiber;
  /**
   * if the child fiber is created but not committed yet,
   * reset the child fiber to alternate child
   */
  if (child && child.createdAt > root.lastCompleteTime) {
    fiber.child = alternate && alternate.child;
  }
}

// NOTE: Delete this function
window.getBrokenLink = (fiber) => {
  const current = fiber.root.current;
  fiber = current;
  while (fiber) {
    if (fiber.child && fiber.child.parent !== fiber) return fiber;
    fiber = fiber.child;
  }
};
