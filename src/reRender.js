import { UPDATE_SOURCE_EVENT, UPDATE_SOURCE_TRANSITION } from './configs';
import { getCurrentUpdateSource, getCurrentTransition, getUpdateType } from './updateMetaUtils';
import { PREDEFINED_TRANSITION_DEFERRED } from './transitionUtils';
import { setUpdateTime, getCurrentTreeFiber, getFiberFromComponent } from './fiber';
import { doSyncProcessing, doDeferredProcessing } from './workLoop';
import { afterCurrentStack } from './utils';

/**
 * Method to rerender a given component
 * In case of reRender, start from the root,
 * clone the current fiber to wip, and use the wip which is pointing
 * to children of current tree.
 */
export default function reRender(component) {
  let fiber = getFiberFromComponent(component);

  const { root } = fiber;

  const currentUpdateSource = getCurrentUpdateSource();
  const currentTransition = getCurrentTransition();

  const updateType = getUpdateType();

  // get current tree fiber if the fiber is from wip tree
  fiber = getCurrentTreeFiber(fiber, updateType);

  // set updateTime on fiber parent hierarchy based on updateType
  setUpdateTime(fiber, updateType);

  // if the update source is transition add the transition in pending transition
  if (currentUpdateSource === UPDATE_SOURCE_TRANSITION) {
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
  if (root.batchUpdates[currentUpdateSource]) return;

  root.batchUpdates[currentUpdateSource] = afterCurrentStack(() => {
    // reset batch update so it can start taking new updates
    root.batchUpdates[currentUpdateSource] = null;

    root.updateSource = currentUpdateSource;

    // if there is any work to done, perform the work else do deferred processing
    if (root.lastCompleteTime < root.updateTime) {
      doSyncProcessing(currentUpdateSource === UPDATE_SOURCE_EVENT ? fiber : root.current);
    } else {
      doDeferredProcessing(root);
    }
  });
}
