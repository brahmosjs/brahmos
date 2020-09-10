// @flow
import { PREDEFINED_TRANSITION_DEFERRED } from './transitionUtils';

import type { HostFiber } from './flow.types';
type TimeRemaining = () => boolean;

const RENDER_SLOT = 5;
const MAX_RENDER_SLOT = 30; // We can allow to drop frame rate to minimum 30 fps
const FRAME_DURATION_DEFAULT = 16; // Default we try to keep it under 60 fps
const DEFERRED_TRANSITION_MAX_RETRY = 300; // close to 5000ms -> 16 * 300 with some buffer
const OTHER_TRANSITION_MAX_RETRY = 600; // close to 10000ms -> 16 * 600 with some buffer

let firstFrameTime;
requestAnimationFrame((time) => {
  firstFrameTime = time;
});

const getTime = () => performance.now();

const timedOutRemaining: TimeRemaining = () => true;

const frameRemainingTime = (currentTime, frameDuration) => {
  frameDuration = frameDuration || FRAME_DURATION_DEFAULT;

  return frameDuration - ((currentTime - firstFrameTime) % frameDuration);
};

/**
 * create a message channel instead of using setTimeouts
 * setTimeouts are clamped to ~4ms which make scheduling slow
 */
let port, channelCallbacks;
if (typeof MessageChannel !== 'undefined') {
  channelCallbacks = [];
  const channel = new MessageChannel();
  channel.port1.onmessage = function() {
    channelCallbacks.forEach((handle) => handle());
  };
  port = channel.port2;
}

function schedule(cb) {
  /**
   * If Message channel is not available or frame is about to end use combination of timeout and requestIdleCallback,
   */
  if (!port || frameRemainingTime(getTime()) < 1) {
    const scheduleCb = () => {
      cancelSchedule();
      cb();
    };

    /**
     * Start both timer and request idle callback to schedule processing in next frame
     * and which ever is called first cancel the other one
     */
    const timeoutId = setTimeout(scheduleCb, 1);
    const ricId = requestIdleCallback(scheduleCb);

    const cancelSchedule = () => {
      clearTimeout(timeoutId);
      cancelIdleCallback(ricId);
    };

    return cancelSchedule;
  }

  // If we have enough time use message channel as message channels are called more often
  channelCallbacks.push(cb);
  port.postMessage(null);

  return () => {
    const index = channelCallbacks.indexOf(cb);
    if (index !== -1) channelCallbacks.splice(index, 1);
  };
}

export default function scheduleTask(
  root: HostFiber,
  shouldSchedule: boolean,
  cb: (timeRemaining: TimeRemaining) => void,
) {
  const { cancelSchedule } = root;

  // cancel any existing scheduled task on root
  if (cancelSchedule) {
    cancelSchedule();
    root.cancelSchedule = null;
  }

  if (shouldSchedule) {
    root.cancelSchedule = schedule(() => {
      const { currentTransition } = root;
      const tryCount = currentTransition ? currentTransition.tryCount : 0;

      /**
       * we get to limit retries in deferred update, otherwise deferred updated
       * can starve by a sync update. So eventually deferred update has to be flushed.
       */
      const maxAllowedRetry =
        currentTransition === PREDEFINED_TRANSITION_DEFERRED
          ? DEFERRED_TRANSITION_MAX_RETRY
          : OTHER_TRANSITION_MAX_RETRY;

      const slotStartTime = getTime();

      /**
       * We keep incrementing slot time based on tryCount max to MAX_RENDER_SLOT.
       * This may reduce the frame rate, but allows the deferred update to execute.
       * We are clamping the minimum frame rate to 30fps, so increasing frame time is
       * fine.
       */
      const slotTime = Math.min(MAX_RENDER_SLOT, RENDER_SLOT + tryCount);

      /**
       * For a render slot time we round frameDuration to nearest frame size.
       */
      const frameDuration = Math.floor(slotTime / FRAME_DURATION_DEFAULT) * FRAME_DURATION_DEFAULT;

      const timeRemaining = () => {
        const currentTime = getTime();

        /**
         * Make sure we don't eat up a frame, so clamping it to remaining frame time is required.
         * Its not perfect as its heuristic based on initial frame time, but does the job when
         * combined with requestIdleCallback
         */
        const maxSlotTime = frameRemainingTime(currentTime, frameDuration);
        const slotEndTime = slotStartTime + Math.min(RENDER_SLOT, maxSlotTime);
        return currentTime < slotEndTime;
      };

      // If we cross max allowed retry we need to flush render synchronously
      cb(tryCount > maxAllowedRetry ? timedOutRemaining : timeRemaining);
    });

    return;
  }

  cb(timedOutRemaining);
}
