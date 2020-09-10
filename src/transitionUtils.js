// @flow
import { getUniqueId } from './utils';
import {
  UPDATE_SOURCE_TRANSITION,
  TRANSITION_STATE_START,
  TRANSITION_STATE_SUSPENDED,
  TRANSITION_STATE_RESOLVED,
  TRANSITION_STATE_COMPLETED,
  TRANSITION_STATE_TIMED_OUT,
} from './configs';

import type {
  PredefinedTransition,
  Transition,
  AnyTransition,
  Fiber,
  HostFiber,
} from './flow.types';

export const PREDEFINED_TRANSITION_SYNC: PredefinedTransition = {
  transitionId: '',
  tryCount: 0,
  transitionState: TRANSITION_STATE_TIMED_OUT,
};

export const PREDEFINED_TRANSITION_DEFERRED: PredefinedTransition = {
  transitionId: getUniqueId(),
  tryCount: 0,
  transitionState: TRANSITION_STATE_TIMED_OUT,
};

function shouldProcessTransition(transition: AnyTransition) {
  const { transitionState } = transition;
  return (
    transitionState === TRANSITION_STATE_START ||
    transitionState === TRANSITION_STATE_RESOLVED ||
    transitionState === TRANSITION_STATE_TIMED_OUT
  );
}

export function isTransitionCompleted(transition: AnyTransition): boolean {
  const { transitionState } = transition;

  return (
    transitionState === TRANSITION_STATE_COMPLETED || transitionState === TRANSITION_STATE_TIMED_OUT
  );
}

export function isTransitionResolved(transition: Transition): boolean {
  const { transitionState } = transition;

  // send true, on either the transition is resolved or completed
  return transitionState === TRANSITION_STATE_RESOLVED || isTransitionCompleted(transition);
}

export function setTransitionComplete(transition: AnyTransition): void {
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
      // $FlowFixMe: We check if its not timed out already, so we can ignore flowtype error here
      transition.transitionState = TRANSITION_STATE_COMPLETED;
    }
  }
}

/**
 * get current transition id from the current rendering
 */
export function getTransitionFromFiber(
  fiber: Fiber,
  defaultTransition: ?PredefinedTransition,
): AnyTransition {
  defaultTransition = defaultTransition || PREDEFINED_TRANSITION_SYNC;
  // if there is currentTransition return that or else return SYNC transition
  return fiber.root.currentTransition || defaultTransition;
}

/**
 * function to get first pending transition
 */
export function getFirstTransitionToProcess(root: HostFiber): ?AnyTransition {
  const { pendingTransitions } = root;
  return pendingTransitions.find(shouldProcessTransition);
}

/**
 * function to check if a transition is a custom transition
 */
export function isCustomTransition(transition: Transition): boolean {
  return !!transition.startTransition;
}
