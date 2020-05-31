import * as Brahmos from './createElement';
import {
  UPDATE_SOURCE_INITIAL_RENDER,
  UPDATE_SOURCE_TRANSITION,
  UPDATE_SOURCE_EVENT,
  updateSource,
  currentTransition,
  getUpdateType,
} from './updateMetaUtils';
import { PREDEFINED_TRANSITION_DEFERRED } from './transitionUtils';
import { createFiber, createHostFiber, setUpdateTime } from './fiber';
import { doSyncProcessing, doDeferredProcessing } from './workLoop';
import { afterCurrentStack } from './utils';

function BrahmosRootComponent({ children }) {
  return children;
}

/**
 * Method to render a node
 */
export default function render(node, target) {
  const rootNode = <BrahmosRootComponent>{node}</BrahmosRootComponent>;

  const part = {
    parentNode: target,
    isNode: true,
  };

  let { __rootFiber: rootFiber } = target;

  let fiber;

  if (!rootFiber) {
    rootFiber = createHostFiber(target);

    fiber = createFiber(rootFiber, rootNode, part);

    // make the rootFiber parent of fiber
    fiber.parent = rootFiber;

    // make the root fiber the wip fiber of rootFiber
    rootFiber.current = fiber;

    // add root fiber on target
    target.__rootFiber = rootFiber;

    /**
     * do not schedule in first render
     * NOTE: This will also affect sync setStates inside componentDidMount, or useEffects.
     * This is expected to prevent multiple repaints
     */
    rootFiber.preventSchedule = true;
  } else {
    /**
     * TODO: Check this part of logic looks incorrect
     * if we are calling render method again, start again,
     * no need to clone the root fiber as it will always be different
     */
    fiber = rootFiber.current;
    fiber.processedTime = 0;
    fiber.node = rootNode;
  }

  doSyncProcessing(rootFiber.current);

  afterCurrentStack(() => {
    // reset preventSchedule after render
    rootFiber.preventSchedule = false;
  });
}

/**
 * Method to rerender a given component
 * In case of reRender, start from the root,
 * clone the current fiber to wip, and use the wip which is pointing
 * to children of current tree.
 */
export function reRender(component) {
  const { __fiber: fiber } = component;
  const { root } = fiber;

  // set updateTime on fiber parent hierarchy based on updateType
  const updateType = getUpdateType();
  setUpdateTime(fiber, updateType);

  // if the update source is transition add the transition in pending transition
  if (updateSource === UPDATE_SOURCE_TRANSITION) {
    const { pendingTransitions } = root;

    /**
     * If it is predefined deferred transition, we need to add current transition
     * as first item as PREDEFINED_TRANSITION_DEFERRED has more priority
     * or else add it in last of pendingTransitions
     */
    const arrayAddMethod =
      currentTransition === PREDEFINED_TRANSITION_DEFERRED ? 'unshift' : 'push';

    // add the current transition to pending transition if it isn't already there.
    if (!pendingTransitions.includes(currentTransition)) {
      pendingTransitions[arrayAddMethod](currentTransition);
    }
  }

  /**
   * if there is already a batch update happening, early return
   * as all the state change will be covered with that batch update
   */
  if (root.batchUpdates[updateSource]) return;

  root.batchUpdates[updateSource] = afterCurrentStack(() => {
    // reset batch update so it can start taking new updates
    root.batchUpdates[updateSource] = null;

    root.updateSource = updateSource;

    // if there is any work to done, perform the work else do deferred processing
    if (root.lastCompleteTime < root.updateTime) {
      doSyncProcessing(updateSource === UPDATE_SOURCE_EVENT ? fiber : root.current);
    } else {
      doDeferredProcessing(root);
    }
  });
}
