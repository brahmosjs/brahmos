// @flow
import {
  UPDATE_SOURCE_IMMEDIATE_ACTION,
  UPDATE_SOURCE_TRANSITION,
  UPDATE_TYPE_SYNC,
} from './configs';
import { getCurrentUpdateSource, getCurrentTransition, getUpdateType } from './updateUtils';
import { PREDEFINED_TRANSITION_DEFERRED } from './transitionUtils';
import { setUpdateTime, getFiberFromComponent } from './fiber';
import { doSyncProcessing, doDeferredProcessing } from './workLoop';
import { afterCurrentStack } from './utils';

import type { AnyComponentInstance } from './flow.types';

/**
 * Method to rerender a given component
 * In case of reRender, start from the root,
 * clone the current fiber to wip, and use the wip which is pointing
 * to children of current tree.
 */
export default function reRender(component: AnyComponentInstance): void {
  const fiber = getFiberFromComponent(component);

  const { root } = fiber;
  const { pendingTransitions, batchUpdates } = root;

  const currentUpdateSource = getCurrentUpdateSource();
  const currentTransition = getCurrentTransition();

  const updateType = getUpdateType();

  // set updateTime on fiber parent hierarchy based on updateType
  setUpdateTime(fiber, updateType);

  /**
   * if the update source is transition, and the transition is not already present in pending list
   * add the transition in pending transition
   */
  if (
    currentUpdateSource === UPDATE_SOURCE_TRANSITION &&
    !pendingTransitions.includes(currentTransition)
  ) {
    /**
     * If it is predefined deferred transition, we need to add current transition
     * as first item as PREDEFINED_TRANSITION_DEFERRED has more priority
     * or else add it in last of pendingTransitions
     */

    if (currentTransition === PREDEFINED_TRANSITION_DEFERRED) {
      pendingTransitions.unshift(currentTransition);
    } else {
      pendingTransitions.push(currentTransition);
    }
  }

  /**
   * if there is already a batch update happening, increment the reRender count and
   * early return as all the state change will be covered with that batch update
   */
  if (batchUpdates[currentUpdateSource]) {
    batchUpdates[currentUpdateSource] += 1;
    return;
  }

  batchUpdates[currentUpdateSource] = 1;

  afterCurrentStack(() => {
    const reRenderCount = batchUpdates[currentUpdateSource];
    // reset batch update so it can start taking new updates
    batchUpdates[currentUpdateSource] = 0;

    const isDeferredUpdate = currentUpdateSource === UPDATE_SOURCE_TRANSITION;

    /**
     * Don't try to do deferred rendering if a sync render is pending,
     * as deferred rendering happens after sync render
     */
    if (isDeferredUpdate && root.lastCompleteTime < root.updateTime) return;

    root.updateSource = currentUpdateSource;

    if (isDeferredUpdate) {
      doDeferredProcessing(root);
    } else {
      /**
       * if the update source is event and we don't have any ongoing sync update
       * which we can figure out based on last updateType and if there is any cancelSchedule
       * Start the processing from the fiber which cause the update.
       *
       * Also, when reRenderCount is more than one it means there are multiple update pending
       */
      const hasOngoingSyncUpdates = root.updateType === UPDATE_TYPE_SYNC && root.cancelSchedule;
      const startFromFiber =
        currentUpdateSource === UPDATE_SOURCE_IMMEDIATE_ACTION &&
        !hasOngoingSyncUpdates &&
        reRenderCount === 1;

      doSyncProcessing(startFromFiber ? fiber : root.current);
    }
  });
}
