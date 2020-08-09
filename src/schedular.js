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

export default function schedule(root, shouldSchedule, cb) {
  const { scheduleId } = root;
  if (scheduleId) clearTimeout(scheduleId);

  if (shouldSchedule) {
    const timeOutTime = frameRemainingTime(16);
    root.scheduleId = setTimeout(() => {
      const { currentTransition } = root;
      const tryCount = Math.min(25, currentTransition ? currentTransition.tryCount : 0);
      const timeRemaining = () => {
        return frameRemainingTime(RENDER_CYCLE_TIME + tryCount);
      };

      cb(timeRemaining);
    }, timeOutTime);

    return;
  }

  const executeAlways = () => 1;

  cb(executeAlways);
}
