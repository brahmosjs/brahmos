// @flow
import { afterCurrentStack } from './utils';
import {
  PREDEFINED_TRANSITION_SYNC,
  PREDEFINED_TRANSITION_DEFERRED,
  getTransitionFromFiber,
} from './transitionUtils';
import {
  UPDATE_SOURCE_DEFAULT,
  UPDATE_SOURCE_TRANSITION,
  UPDATE_SOURCE_IMMEDIATE_ACTION,
  BRAHMOS_DATA_KEY,
  UPDATE_TYPE_SYNC,
  UPDATE_TYPE_DEFERRED,
} from './configs';
import { getCurrentComponentFiber } from './fiber';

import type {
  AnyComponentInstance,
  HostFiber,
  Fiber,
  UpdateSource,
  AnyTransition,
  UpdateType,
  PendingUpdates,
  ClassComponentUpdate,
  FunctionalComponentUpdate,
} from './flow.types';

export const deferredMeta = {
  initialized: false,
  timeout: 0,
};

let updateSource = UPDATE_SOURCE_DEFAULT;
let currentTransition = PREDEFINED_TRANSITION_SYNC;

export function getDeferredMeta() {
  return { ...deferredMeta };
}

export function setUpdateSource(source: UpdateSource) {
  updateSource = source;
}

export function getCurrentUpdateSource() {
  return updateSource;
}

export function getCurrentTransition() {
  return currentTransition;
}

function resetUpdateSource() {
  /**
   * reset update source when the current stack execution is done,
   * This will make sure if there is sync update like event or
   * force update, or initial render all the sync render and commit phase is done
   */
  afterCurrentStack(() => {
    updateSource = UPDATE_SOURCE_DEFAULT;
  });
}

/**
 * Function to execute something in context of custom source
 */
export function withUpdateSource(source: UpdateSource, cb: Function): void {
  updateSource = source;
  cb();
  updateSource = UPDATE_SOURCE_DEFAULT;
}

export function withTransition(transition: AnyTransition, cb: Function): void {
  const prevTransition = currentTransition;
  currentTransition = transition;
  // set update source as a transition before calling callback
  withUpdateSource(UPDATE_SOURCE_TRANSITION, cb);
  currentTransition = prevTransition;
}

export function shouldPreventSchedule(root: HostFiber): boolean {
  // it should prevent scheduling if immediate update is required
  return root.updateSource === UPDATE_SOURCE_IMMEDIATE_ACTION;
}

export function isDeferredUpdate(): boolean {
  return updateSource === UPDATE_SOURCE_TRANSITION;
}

export function getUpdateType(): UpdateType {
  return isDeferredUpdate() ? UPDATE_TYPE_DEFERRED : UPDATE_TYPE_SYNC;
}

/**
 * Get the pendingUpdates key in class component instance
 */

export function getPendingUpdatesKey(updateType: UpdateType) {
  return updateType === UPDATE_TYPE_DEFERRED ? 'pendingDeferredUpdates' : 'pendingSyncUpdates';
}

/**
 * Get pending states based on update type and current transition
 */
export function getPendingUpdates(fiber: Fiber): PendingUpdates {
  const {
    root: { updateType },
    nodeInstance: component,
  } = fiber;
  const brahmosData = component[BRAHMOS_DATA_KEY];
  const pendingUpdatesKey = getPendingUpdatesKey(updateType);

  if (updateType === UPDATE_TYPE_SYNC) {
    return brahmosData[pendingUpdatesKey];
  }

  const currentTransitionId = getTransitionFromFiber(fiber, null).transitionId;

  return brahmosData[pendingUpdatesKey].filter(
    (stateMeta) => stateMeta.transitionId === currentTransitionId,
  );
}

// function to trigger deferred updates
export function deferredUpdates(cb: Function): void {
  withTransition(PREDEFINED_TRANSITION_DEFERRED, cb);
}

/**
 * function to trigger sync updates which doesn't schedule
 * And rendered and committed synchronously
 */
export function syncUpdates(cb: Function): void {
  withUpdateSource(UPDATE_SOURCE_IMMEDIATE_ACTION, cb);
}

function getComponentFiberInWorkingTree(fiber, nodeInstance) {
  const { root } = fiber;

  while (!(fiber.nodeInstance === nodeInstance)) {
    fiber = fiber.parent;

    if (fiber === root) return null;
  }

  return fiber;
}
/**
 * get guarded update meta details. Through error if setState is called
 * too many times
 */
export function guardedSetState(
  componentInstance: AnyComponentInstance,
  getStateMeta: (transitionId: string) => ClassComponentUpdate | FunctionalComponentUpdate,
): boolean {
  let updateType, currentTransition;
  let shouldRerender = true;
  const brahmosData = componentInstance[BRAHMOS_DATA_KEY];

  const fiber = getCurrentComponentFiber();
  /**
   * if the setState is called while rendering, which will be the case when current fiber is set
   */
  if (fiber) {
    const { renderCount } = brahmosData;

    // if render count is more than 50 probably we got into infinite loop
    if (renderCount > 50) {
      throw new Error(
        'Too many rerender. Check your setState call, this may cause an infinite loop.',
      );
    }

    const { root } = fiber;

    // mark the component to retry the components fiber
    root.retryFiber = getComponentFiberInWorkingTree(fiber, componentInstance);

    updateType = root.updateType;
    currentTransition = root.currentTransition || PREDEFINED_TRANSITION_SYNC;

    // we do not want to rerender in this case as the component fiber will be retried
    shouldRerender = false;
  } else {
    // reset the renderCount if not called during the render phase
    brahmosData.renderCount = 0;

    updateType = getUpdateType();
    currentTransition = getCurrentTransition();
  }

  const pendingUpdateKey = getPendingUpdatesKey(updateType);
  const stateMeta = getStateMeta(currentTransition.transitionId);

  brahmosData[pendingUpdateKey].push(stateMeta);

  return shouldRerender;
}
