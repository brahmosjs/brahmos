import { getUniqueId } from './utils';

export const TRANSITION_STATE_INITIAL = 'initial';
export const TRANSITION_STATE_PENDING = 'pending';
export const TRANSITION_STATE_TIMED_OUT = 'timedOut';
export const TRANSITION_STATE_SUSPENDED = 'suspended';
export const TRANSITION_STATE_COMPLETED = 'completed';

export const PREDEFINED_TRANSITION_SYNC = {
  transitionId: '',
};

export const PREDEFINED_TRANSITION_DEFERRED = {
  transitionId: getUniqueId(),
  isPending: false,
  transitionState: TRANSITION_STATE_TIMED_OUT,
};

/**
 * get current transition id from the current rendering
 */
export function getTransitionFromFiber(fiber) {
  const { currentTransition } = fiber.root;
  return currentTransition || PREDEFINED_TRANSITION_SYNC;
}

/**
 * function to get first pending transition
 */
export function getFirstPendingTransition(root) {
  const { pendingTransitions } = root;
  return pendingTransitions.find(
    (transition) => transition.transitionState === TRANSITION_STATE_PENDING,
  );
}
