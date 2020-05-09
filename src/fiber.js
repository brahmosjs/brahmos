import { isComponentNode, isTagNode, isPrimitiveNode, ATTRIBUTE_NODE } from './brahmosNode';

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
  const { node, part, child, sibling, updatedTime } = fiber;

  const workAlreadyDone = wipFiber && wipFiber.updatedTime > updatedTime;

  if (!wipFiber) {
    wipFiber = createFiber(fiber.root, node, part);
    // add fibers as each others alternate
    addAlternates(fiber, wipFiber);
  } else if (!workAlreadyDone) {
    wipFiber.node = node;
    wipFiber.part = part;
  }

  /**
   * If work isn't already done add the current child and sibling pointer to work in progress fiber
   * If it's done we should stick to wip child and sibling
   * */
  if (!workAlreadyDone) {
    wipFiber.child = child;
    wipFiber.sibling = sibling;

    wipFiber.updatedTime = performance.now();
  }

  // link the new fiber to its parent or it's previous sibling
  linkFiber(wipFiber, refFiber, parentFiber);

  return wipFiber;
}

export function getNextChildFiber(refFiber, parentFiber) {
  return refFiber === parentFiber ? refFiber.child : refFiber.sibling;
}

export function cloneChildrenFibers(fiber) {
  let { child, updatedTime } = fiber;

  // do not clone children if the children are already newer fiber than the parent
  if (child && child.updatedTime > updatedTime) {
    return;
  }

  let lastChild;

  while (child) {
    /**
     * use the alternate node as wip node, as its no longer used by current node,
     * so we can reuse the object instead of creating a new one.
     * If it doesn't have any alternate node it means this is a new node,
     * so need to clone them again
     */
    const { alternate } = child;

    cloneCurrentFiber(child, alternate, lastChild || parent, parent);

    lastChild = child;
    child = child.sibling;
  }
}

export function createHostFiber(domNode) {
  const rootFiber = {
    domNode,
    idleCallback: null,
    current: null,
    wip: null,
    lastEffectFiber: null,
    lastSuspenseFiber: null,
    tearDownFibers: [],
    postCommitEffects: [],
    nextEffect: null,
    alternate: null,
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
    nextEffect: null,
    processed: false, // new fiber always have to be processed
    updatedTime: performance.now(),
  };
}

// create a linked list through parent and child
export function link(parent, children) {
  const lastChild = null;
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    child.sibling = lastChild;
    child.parent = parent;
  }

  parent.child = lastChild;
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
  let fiber;
  if (currentFiber && shouldClone(node, currentFiber.node)) {
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

  fiber.processed = false;

  return fiber;
}

export function createCurrentAndLink(node, part, refFiber, parentFiber) {
  const currentFiber = getNextChildFiber(refFiber, parentFiber);
  return createAndLink(node, part, currentFiber, refFiber, parentFiber);
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

export function getNextFiber(fiber) {
  // if there a child return child
  if (fiber.child) return fiber.child;

  // or else return the sibling or the next uncle to process
  while (!fiber.sibling) {
    /**
     * If we don't find any parent it means we reached at top to root, so return that
     */
    if (!fiber.parent) return fiber;

    // set the parent as the current fiber
    fiber = fiber.parent;
  }

  // return fiber's sibling
  return fiber.sibling;
}

export function cloneWIPClone(fiber, parent) {
  if (!fiber) return fiber;
  const newFiber = { ...fiber, parent };

  // recurse on children and sibling
  newFiber.child = cloneWIPClone(fiber.child, newFiber);
  newFiber.sibling = cloneWIPClone(fiber.sibling, parent);

  addAlternates(fiber, newFiber);
  return newFiber;
}
