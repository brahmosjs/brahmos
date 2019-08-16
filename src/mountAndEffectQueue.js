/**
 * This queue contains the mount (componentDidMount) handlers.
 * And this handlers are called after the dom is attached to the element.
 */

let queue = [];

export function addHandler (handler) {
  queue.push(handler);
}

export function removeHandler (handler) {
  const handlerIndex = queue.indexOf(handler);
  if (handlerIndex !== -1) {
    // Mutating key here for performance reason, and as we know it will not have side-effects
    queue.splice(handlerIndex, 1);
  }
}

export function applyHandlers () {
  for (let i = 0, ln = queue.length; i < ln; i++) {
    queue[i]();
  }

  queue = [];
}
