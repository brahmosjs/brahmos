/**
 * This queue contains the mount (componentDidMount) handlers.
 * And this handlers are called after the dom is attached to the element.
 */

import { callLifeCycle } from './utils';

let queue = [];

export function addHandler (object, method, args) {
  queue.push({ object, method, args });
}

export function applyHandlers () {
  for (let i = 0, ln = queue.length; i < ln; i++) {
    const { object, method, args } = queue[i];
    callLifeCycle(object, method, args);
  }

  queue = [];
}
