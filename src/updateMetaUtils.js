import { afterCurrentStack } from './utils';
import { PREDEFINED_TRANSITION_SYNC, getTransitionFromFiber } from './transitionUtils';
import {
  UPDATE_SOURCE_DEFAULT,
  UPDATE_SOURCE_TRANSITION,
  UPDATE_SOURCE_EVENT,
  UPDATE_SOURCE_FORCE_UPDATE,
  UPDATE_SOURCE_UNSTABLE_DEFERRED,
  BRAHMOS_DATA_KEY,
  UPDATE_TYPE_SYNC,
  UPDATE_TYPE_DEFERRED,
} from './configs';

export const deferredMeta = {
  initialized: false,
  timeout: 0,
};

let updateSource = 'js';
let currentTransition = PREDEFINED_TRANSITION_SYNC;

export function getDeferredMeta() {
  return { ...deferredMeta };
}

export function setUpdateSource(source) {
  updateSource = source;
}

export function getCurrentUpdateSource() {
  return updateSource;
}

export function getCurrentTransition() {
  return currentTransition;
}

export function resetUpdateSource() {
  /**
   * reset update source one the current stack execution is done,
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
export function withUpdateSource(source, cb) {
  updateSource = source;
  cb();
  resetUpdateSource();
}

export function withTransition(transition, cb) {
  const prevTransition = currentTransition;
  currentTransition = transition;
  // set update source as a transition before calling callback
  withUpdateSource(UPDATE_SOURCE_TRANSITION, cb);
  currentTransition = prevTransition;
}

export function shouldPreventSchedule(root) {
  const { updateSource, preventSchedule } = root;
  /**
   * In case we explicity prevent schedule or
   * set state triggered from event, or force update
   * we don't want to do things synchronously
   * as it needs to be flushed synchronously
   */
  return (
    preventSchedule ||
    updateSource === UPDATE_SOURCE_EVENT ||
    updateSource === UPDATE_SOURCE_FORCE_UPDATE
  );
}

export function isDeferredUpdate() {
  return (
    updateSource === UPDATE_SOURCE_UNSTABLE_DEFERRED || updateSource === UPDATE_SOURCE_TRANSITION
  );
}

export function getUpdateType() {
  return isDeferredUpdate() ? UPDATE_TYPE_DEFERRED : UPDATE_TYPE_SYNC;
}

/**
 * Get the pendingUpdates key in class component instance
 */

export function getPendingUpdatesKey(updateType) {
  return updateType === UPDATE_TYPE_DEFERRED ? 'pendingDeferredUpdates' : 'pendingSyncUpdates';
}

/**
 * Get pending states based on update type and current transition
 */
export function getPendingUpdates(updateType, component) {
  const brahmosData = component[BRAHMOS_DATA_KEY];
  const currentTransitionId = getTransitionFromFiber(brahmosData.fiber).transitionId;
  const pendingUpdatesKey = getPendingUpdatesKey(updateType);

  return brahmosData[pendingUpdatesKey].filter(
    (stateMeta) => stateMeta.transitionId === currentTransitionId,
  );
}
