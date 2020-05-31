import { withTransition } from './updateMetaUtils';
import { PREDEFINED_TRANSITION_DEFERRED } from './transitionUtils';

export function deferredUpdates(cb) {
  withTransition(PREDEFINED_TRANSITION_DEFERRED, cb);
}
