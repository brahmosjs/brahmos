import { PREDEFINED_TRANSITION_DEFERRED } from './transitionUtils';

const RENDER_CYCLE_TIME = 5;
let lastFrameTime;

function updateFrameTime() {
  requestAnimationFrame((time) => {
    lastFrameTime = time;
    updateFrameTime();
  });
}

updateFrameTime();

function frameRemainingTime(allowedTime) {
  return lastFrameTime + allowedTime - performance.now();
}

const timedOutRemaining = () => 1;

export default function schedule(root, shouldSchedule, cb) {
  const { scheduleId } = root;
  if (scheduleId) clearTimeout(scheduleId);

  if (shouldSchedule) {
    const timeOutTime = frameRemainingTime(16);

    root.scheduleId = setTimeout(() => {
      const { currentTransition } = root;
      const tryCount = currentTransition ? currentTransition.tryCount : 0;
      const maxAllowedRetry = currentTransition === PREDEFINED_TRANSITION_DEFERRED ? 200 : 500;

      const additionalTime = Math.min(25, tryCount);

      const timeRemaining = () => {
        return frameRemainingTime(RENDER_CYCLE_TIME + additionalTime);
      };
      cb(tryCount > maxAllowedRetry ? timedOutRemaining : timeRemaining);
    }, timeOutTime);

    return;
  }

  cb(timedOutRemaining);
}
