import { PREDEFINED_TRANSITION_DEFERRED } from './transitionUtils';

const RENDER_SLOT = 5;
const MIN_RENDER_SLOT = 2;
const MAX_RENDER_SLOT = 30;
const FRAME_TIME = 16;
const DEFERRED_TRANSITION_MAX_RETRY = 300; // close to 5000ms -> 16 * 300 with some buffer
const OTHER_TRANSITION_MAX_RETRY = 600; // close to 10000ms -> 16 * 600 with some buffer


let lastFrameTime;

function updateFrameTime() {
  requestAnimationFrame((time) => {
    lastFrameTime = time;
    updateFrameTime();
  });
}

updateFrameTime();

function frameRemainingTime(frameTime) {
  return lastFrameTime + frameTime - performance.now();
}

const timedOutRemaining = () => 1;

export default function schedule(root, shouldSchedule, cb) {
  const { scheduleId } = root;
  if (scheduleId) clearTimeout(scheduleId);

  if (shouldSchedule) {
    const _frameRemainingTime = frameRemainingTime(FRAME_TIME);
    /**
     * if remaining time is less than minium render time threshold,
     * push it to next frame, else use same frame
     */
    const timeOutTime = _frameRemainingTime > MIN_RENDER_SLOT ? 0 : _frameRemainingTime + 1;

    root.scheduleId = setTimeout(() => {
      const { currentTransition } = root;
      const tryCount = currentTransition ? currentTransition.tryCount : 0;
      const maxAllowedRetry = currentTransition === PREDEFINED_TRANSITION_DEFERRED ? DEFERRED_TRANSITION_MAX_RETRY : OTHER_TRANSITION_MAX_RETRY;

      const slotTime = Math.min(MAX_RENDER_SLOT, RENDER_SLOT + tryCount);

      const timeRemaining = () => {
        return frameRemainingTime(slotTime);
      };
      cb(tryCount > maxAllowedRetry ? timedOutRemaining : timeRemaining);
    }, timeOutTime);

    return;
  }

  cb(timedOutRemaining);
}
