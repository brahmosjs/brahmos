// @flow
import {
  isComponentNode,
  isPrimitiveNode,
  isRenderableNode,
  isTagNode,
  ATTRIBUTE_NODE,
} from './brahmosNode';

import {
  UPDATE_SOURCE_TRANSITION,
  BRAHMOS_DATA_KEY,
  UPDATE_TYPE_DEFERRED,
  EFFECT_TYPE_OTHER,
  UPDATE_TYPE_SYNC,
  UPDATE_SOURCE_IMMEDIATE_ACTION,
} from './configs';

import processComponentFiber from './processComponentFiber';
import { processTextFiber } from './processTextFiber';
import processTagFiber from './processTagFiber';
import effectLoop, {
  preCommitBookkeeping,
  resetEffectProperties,
  removeTransitionFromRoot,
} from './effectLoop';
import { shouldPreventSchedule, getPendingUpdates, withUpdateSource } from './updateUtils';
import {
  getFirstTransitionToProcess,
  setTransitionComplete,
  isTransitionCompleted,
} from './transitionUtils';
import {
  getNextFiber,
  cloneChildrenFibers,
  getUpdateTimeKey,
  getLastCompleteTimeKey,
  cloneCurrentFiber,
  markToTearDown,
  markPendingEffect,
} from './fiber';
import processArrayFiber from './processArrayFiber';
import tearDown from './tearDown';
import { now } from './utils';
import schedule from './scheduler';

import type { Fiber, HostFiber } from './flow.types';

function fiberHasUnprocessedUpdates(fiber) {
  const { node, nodeInstance } = fiber;

  /**
   * Return if node is not component type or if it is component
   * which is yet to mount (nodeInstance will be null in such case)
   */
  if (!(isComponentNode(node) && nodeInstance)) return false;

  return !!getPendingUpdates(fiber).length || nodeInstance[BRAHMOS_DATA_KEY].isDirty;
}

export function processFiber(fiber: Fiber) {
  const { node, alternate } = fiber;

  // if new node is null mark old node to tear down
  if (!isRenderableNode(node)) {
    if (alternate) markToTearDown(alternate);
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
    // nothing to on process phase, just mark that the fiber has uncommitted effects
    markPendingEffect(fiber, EFFECT_TYPE_OTHER);
  }

  // after processing, set the processedTime to the fiber
  fiber.processedTime = now();
}

function shouldCommit(root) {
  // if there is transition processed on work loop check if its completed
  if (root.currentTransition) {
    /**
     * all sync changes should be committed before committing transition,
     * for a transition to be committed it shouldn't have any pending commits
     * if not no need to run the commit phase
     */
    return (
      root.lastCompleteTime >= root.updateTime &&
      root.hasUncommittedEffect &&
      isTransitionCompleted(root.currentTransition)
    );
  }

  // otherwise return true for sync commits
  return true;
}

/**
 * This is the part where all the changes are flushed on dom,
 * It will also take care of tearing the old nodes down
 */
// Use object notation to avoid inlining of commit changes fn in workloop
const avoidInlineCommitChange = {
  fn: (root) => {
    const { updateType, current } = root;
    const lastCompleteTimeKey = getLastCompleteTimeKey(updateType);

    // tearDown old nodes
    tearDown(root);

    const fibersWithEffect = preCommitBookkeeping(root);
    /**
     * set the last updated time for render
     * NOTE: We do it before effect loop so if there is
     * setStates in effect updateTime for setState should not
     * fall behind the complete time
     *
     * Also, lastCompleteTime should be marked always
     * weather its deferred or sync updates
     */
    root[lastCompleteTimeKey] = root.lastCompleteTime = now();

    // if it deferred swap the wip and current tree
    if (updateType === UPDATE_TYPE_DEFERRED) {
      // $FlowFixMe: wip fiber is set after deferred render
      root.current = root.wip;
      root.wip = current;
    }

    // After correcting the tree flush the effects on new fibers
    /**
     * There can be state updates inside effects/lifecycle, so we should mark it as
     * immediate update  so we don't have multiple paints
     */
    withUpdateSource(UPDATE_SOURCE_IMMEDIATE_ACTION, () => effectLoop(root, fibersWithEffect));
  },
};

export default function workLoop(fiber: Fiber, topFiber: Fiber | HostFiber) {
  const { root } = fiber;
  const { updateType, currentTransition } = root;
  const lastCompleteTimeKey = getLastCompleteTimeKey(updateType);
  const updateTimeKey = getUpdateTimeKey(updateType);
  const lastCompleteTime = root[lastCompleteTimeKey];

  /**
   * If the update is triggered from update source which needs to be flushed
   * synchronously we don't need requestIdleCallback, in other case we should
   * schedule our renders.
   */
  const shouldSchedule = !shouldPreventSchedule(root);
  schedule(root, shouldSchedule, (timeRemaining) => {
    while (fiber !== topFiber) {
      // process the current fiber which will return the next fiber
      /**
       * If there is time remaining to do some chunk of work,
       * process the current fiber, and then move to next
       * and keep doing it till we are out of time.
       */
      if (timeRemaining()) {
        processFiber(fiber);

        /**
         * if the fiber jump due to suspense or error boundary,
         * we need to use that as next fiber. We also need to reset
         * topFiber to root, as the retry fiber can be in upper hierarchy
         */
        const { retryFiber } = root;
        if (retryFiber) {
          fiber = retryFiber;
          topFiber = root;
          root.retryFiber = null;
        } else {
          fiber = getNextFiber(fiber, topFiber, lastCompleteTime, updateTimeKey);
        }
      } else {
        // if we are out of time schedule work for next fiber
        workLoop(fiber, topFiber);

        return;
      }
    }

    // call all the render callbacks
    root.callRenderCallbacks();

    if (currentTransition) {
      // set transition complete if it is not on suspended or timed out state
      setTransitionComplete(currentTransition);

      // reset try count
      currentTransition.tryCount = 0;

      /**
       * if transition is completed and it does not have any effect to commit, we should remove the
       * transition from pending transition
       */
      if (!root.hasUncommittedEffect && isTransitionCompleted(currentTransition)) {
        removeTransitionFromRoot(root);
      }
    }

    if (shouldCommit(root)) {
      avoidInlineCommitChange.fn(root);
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

export function doDeferredProcessing(root: HostFiber) {
  // if there is no deferred work or pending transition return
  const pendingTransition = getFirstTransitionToProcess(root);

  if (!pendingTransition) return;

  root.updateType = UPDATE_TYPE_DEFERRED;

  // reset the effect list before starting new one
  resetEffectProperties(root);

  // set the pending transition as current transition
  root.currentTransition = pendingTransition;

  pendingTransition.tryCount += 1;

  // $FlowFixMe: Passing root on top level component is exception
  root.wip = cloneCurrentFiber(root.current, root.wip, root, root);

  workLoop(root.wip, root);
}

export function doSyncProcessing(fiber: Fiber) {
  const { root, parent } = fiber;
  root.updateType = UPDATE_TYPE_SYNC;

  // set current transition as null for sync processing
  root.currentTransition = null;

  // reset the effect list before starting new one
  resetEffectProperties(root);

  workLoop(fiber, parent);
}
