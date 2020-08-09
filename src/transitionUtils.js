import { getUniqueId } from './utils';
import { UPDATE_SOURCE_TRANSITION } from './configs';

export const TRANSITION_STATE_INITIAL = 'initial';
export const TRANSITION_STATE_START = 'start';
export const TRANSITION_STATE_SUSPENDED = 'suspended';
export const TRANSITION_STATE_RESOLVED = 'resolved';
export const TRANSITION_STATE_COMPLETED = 'completed';
export const TRANSITION_STATE_TIMED_OUT = 'timedOut';

export const PREDEFINED_TRANSITION_SYNC = {
  transitionId: '',
  tryCount: 0,
  transitionState: TRANSITION_STATE_TIMED_OUT,
};

export const PREDEFINED_TRANSITION_DEFERRED = {
  transitionId: getUniqueId(),
  tryCount: 0,
  transitionState: TRANSITION_STATE_TIMED_OUT,
};

function shouldProcessTransition(transition) {
  const { transitionState } = transition;
  return (
    transitionState === TRANSITION_STATE_START ||
    transitionState === TRANSITION_STATE_RESOLVED ||
    transitionState === TRANSITION_STATE_TIMED_OUT
  );
}

export function isTransitionCompleted(transition) {
  const { transitionState } = transition;

  return (
    transitionState === TRANSITION_STATE_COMPLETED || transitionState === TRANSITION_STATE_TIMED_OUT
  );
}

export function isTransitionResolved(transition) {
  const { transitionState } = transition;

  // send true, on either the transition is resolved or completed
  return transitionState === TRANSITION_STATE_RESOLVED || isTransitionCompleted(transition);
}

export function setTransitionComplete(transition) {
  const { transitionState } = transition;
  if (
    transitionState !== TRANSITION_STATE_TIMED_OUT &&
    transitionState !== TRANSITION_STATE_SUSPENDED
  ) {
    /**
     * If transition is in pending state, first reset the isPending state
     * and then on next render cycle mark transition as completed
     * so that isPending and transition changes can be shown on one commit phase
     */
    if (transition.isPending) {
      transition.clearTimeout();
      transition.updatePendingState(false, UPDATE_SOURCE_TRANSITION);
    } else {
      transition.transitionState = TRANSITION_STATE_COMPLETED;
    }
  }
}

/**
 * get current transition id from the current rendering
 */
export function getTransitionFromFiber(fiber, defaultTransition) {
  defaultTransition = defaultTransition || PREDEFINED_TRANSITION_SYNC;
  // if there is currentTransition return that or else return SYNC transition
  return fiber.root.currentTransition || defaultTransition;
}

/**
 * function to get first pending transition
 */
export function getFirstTransitionToProcess(root) {
  const { pendingTransitions } = root;
  return pendingTransitions.find(shouldProcessTransition);
}

/**
 * function to check if a transition is a custom transition
 */
export function isCustomTransition(transition) {
  return !!transition.startTransition;
}
