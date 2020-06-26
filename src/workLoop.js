import {
  isComponentNode,
  isPrimitiveNode,
  isRenderableNode,
  isTagNode,
  ATTRIBUTE_NODE,
} from './brahmosNode';

import { UPDATE_TYPE_SYNC, BRAHMOS_DATA_KEY } from './configs';

import processComponentFiber from './processComponentFiber';
import { processTextFiber } from './processTextFiber';
import processTagFiber from './processTagFiber';
import effectLoop, { resetEffectList } from './effectLoop';
import {
  UPDATE_SOURCE_TRANSITION,
  shouldPreventSchedule,
  getPendingUpdates,
  withUpdateSource,
} from './updateMetaUtils';
import {
  TRANSITION_STATE_SUSPENDED,
  getFirstTransitionToProcess,
  canCommitTransition,
  setTransitionComplete,
} from './transitionUtils';
import {
  linkEffect,
  getNextFiber,
  cloneChildrenFibers,
  getUpdateTimeKey,
  cloneCurrentFiber,
} from './fiber';
import processArrayFiber from './processArrayFiber';
import tearDown from './tearDown';
import { loopEntries } from './utils';

const TIME_REQUIRE_TO_PROCESS_FIBER = 2;

export function schedule(shouldSchedule, cb) {
  if (shouldSchedule) {
    return requestIdleCallback(cb, { timeout: 1000 });
  }

  cb();
}

function fiberHasUnprocessedUpdates(fiber) {
  const { node, root } = fiber;
  const { updateType } = root;

  const { componentInstance } = node;

  /**
   * Return if node is not component type or if it is component
   * which is yet to mount (componentInstance will be null in such case)
   */
  if (!componentInstance) return false;

  return (
    !!getPendingUpdates(updateType, componentInstance).length ||
    componentInstance[BRAHMOS_DATA_KEY].isDirty
  );
}

/**
 * Function to handle pending suspense managers, if transition is in suspended state
 */
function handlePendingSuspenseManager(root) {
  const { pendingSuspenseMangers } = root;
  loopEntries(pendingSuspenseMangers, (transitionId, pendingMangers) => {
    pendingMangers.forEach((manager) => {
      manager.handleSuspense();
    });
  });
}

export function processFiber(fiber) {
  const { node, root, alternate } = fiber;

  // if new node is null mark old node to tear down
  if (!isRenderableNode(node)) {
    if (alternate) root.tearDownFibers.push(alternate);
    return;
  }

  const nodeHasUpdates = fiberHasUnprocessedUpdates(fiber);

  /**
   * If a fiber is processed and node is not dirty we clone all the children from current tree
   *
   * This will not affect the first render as fiber will never be on processed state
   * on the first render.
   */
  if (fiber.processedTime && !nodeHasUpdates) {
    // We need to clone children only in case we are doing deferred rendering
    cloneChildrenFibers(fiber);
    return;
  }

  if (isPrimitiveNode(node)) {
    processTextFiber(fiber);
  } else if (Array.isArray(node)) {
    processArrayFiber(fiber);
  } else if (isTagNode(node)) {
    processTagFiber(fiber);
  } else if (isComponentNode(node)) {
    processComponentFiber(fiber);
  } else if (node.nodeType === ATTRIBUTE_NODE) {
    linkEffect(fiber);
  }

  // after processing, set the processedTime to the fiber
  fiber.processedTime = performance.now();
}

function shouldCommit(root) {
  if (root.updateSource === UPDATE_SOURCE_TRANSITION) {
    // all sync changes should be committed before committing transition
    return root.lastCompleteTime >= root.updateTime && canCommitTransition(root.currentTransition);
  }

  return true;
}

/**
 * This is the part where all the changes are flushed on dom,
 * It will also take care of tearing the old nodes down
 */
function commitChanges(root, onComplete) {
  const lastCompleteTimeKey =
    root.updateType === 'deferred' ? 'lastDeferredCompleteTime' : 'lastCompleteTime';

  // tearDown old nodes
  tearDown(root);

  /**
   * set the last updated time for render
   * NOTE: We do it before effect loop so setStates in effect are aware of last render finish
   */
  root[lastCompleteTimeKey] = performance.now();

  // when we are done with processing all fiber run effect loop
  effectLoop(root);

  if (onComplete) onComplete();
}

export default function workLoop(fiber, topFiber, onComplete) {
  const { root } = fiber;
  const { updateType, currentTransition } = root;
  const lastCompleteTimeKey =
    updateType === 'deferred' ? 'lastDeferredCompleteTime' : 'lastCompleteTime';
  const updateTimeKey = getUpdateTimeKey(updateType);
  const lastCompleteTime = root[lastCompleteTimeKey];

  /**
   * If the update is triggered from update source which needs to be flushed
   * synchronously we don't need requestIdleCallback, in other case we should
   * schedule our renders.
   */
  const shouldSchedule = !shouldPreventSchedule(root);

  // cancel the previous requestIdle handle
  if (root.requestIdleHandle) cancelIdleCallback(root.requestIdleHandle);

  root.requestIdleHandle = schedule(shouldSchedule, (deadline) => {
    while (fiber !== topFiber) {
      // process the current fiber which will return the next fiber
      /**
       * If there is time remaining to do some chunk of work,
       * process the current fiber, and then move to next
       * and keep doing it till we are out of time.
       */
      if (
        !shouldSchedule ||
        deadline.didTimeout ||
        deadline.timeRemaining() >= TIME_REQUIRE_TO_PROCESS_FIBER
      ) {
        processFiber(fiber);
        fiber = getNextFiber(fiber, topFiber, lastCompleteTime, updateTimeKey);
      } else {
        // if we are out of time schedule work for next fiber
        workLoop(fiber, topFiber, onComplete);

        return;
      }
    }

    console.log(currentTransition, currentTransition && currentTransition.transitionState);

    if (currentTransition) {
      // if the transition is suspended and there are pending suspense managers call this managers
      handlePendingSuspenseManager(root);

      // set transition complete if it is not on suspended or timed out state
      setTransitionComplete(currentTransition);
    }

    if (shouldCommit(root)) {
      commitChanges(root, onComplete);
    }

    // check if there are any pending transition, if yes try rendering them
    if (getFirstTransitionToProcess(root)) {
      withUpdateSource(UPDATE_SOURCE_TRANSITION, () => {
        root.updateSource = UPDATE_SOURCE_TRANSITION;
        doDeferredProcessing(root);
      });
    }
  });
}

export function doDeferredProcessing(root) {
  // if there is no deferred work or pending transition return
  const pendingTransition = getFirstTransitionToProcess(root);

  if (root.lastDeferredCompleteTime >= root.deferredUpdateTime || !pendingTransition) return;

  root.updateType = 'deferred';

  // reset the effect list before starting new one
  resetEffectList(root);

  // if the update source is transition set the current transition
  root.currentTransition =
    root.updateSource === UPDATE_SOURCE_TRANSITION ? pendingTransition : null;

  root.wip = cloneCurrentFiber(root.current, root.wip, root, root);
  workLoop(root.wip, root, () => {
    // after flushing effects (onComplete) swap wip and current
    const { current } = root;

    root.current = root.wip;
    root.wip = current;
  });
}

export function doSyncProcessing(fiber) {
  const { root, parent } = fiber;
  root.updateType = 'sync';

  // set current transition as null for sync processing
  root.currentTransition = null;

  // reset the effect list before starting new one
  resetEffectList(root);

  workLoop(fiber, parent);
}

export function doTransitionProcessing(fiber) {}
