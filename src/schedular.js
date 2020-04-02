import { haveRelation, isTagNode, isComponentNode } from './brahmosNode';

const threads = [];

class Thread {
  constructor (node) {
    this.node = node;
    this.currentNode = node;
    this.processed = false;
    this.flushed = false;
    this.idleCallback = null;
  }

  restart () {
    this.currentNode = this.node;
    this.domEffects = [];
    this.componentEffects = [];
    this.stop();
    this.start();
  }

  start () {
    this.idleCallback = requestIdleCallback(({ didTimeout, timeRemaining }) => {
      if (timeRemaining() || didTimeout) {
        this.walk(timeRemaining, didTimeout);
      } else {
        this.start();
      }
    }, 1000);
  }

  walk (timeRemaining, didTimeout) {
    let { currentNode: current } = this;
    const { node: root } = this;
    while ((timeRemaining() || didTimeout) && current !== root) {
      // process the current node
      this.process(current);

      const child = current.child;

      // if there's a child, set it as the current node to process
      if (child) {
        current = child;
        continue;
      }

      // if the current node is the root node we don't need to loop further, exit from here
      if (current === root) {
        return;
      }

      // keep going up until we find the sibling
      while (!current.sibling) {
        /**
         * if the parent node of current is root,
         * it means we didn't find any sibling to process so return from there
         */
        if (!current.parent || current.parent === root) {
          return;
        }

        // set the parent as the current node
        current = current.parent;
      }

      // if found, set the sibling as the current node
      current = current.sibling;
    }
  }

  process (node) {
    if (isComponentNode(node) && node.dirty) {

    } else if (isTagNode(node)) {

    }
  }

  flushEffects () {
    const { domEffects, componentEffects, snapshotEffects } = this;

    // flush all the snapshot effects first
    for (let i = 0, ln = snapshotEffects.length; i < ln; i++) {
      const node = snapshotEffects[i];
      node.snapshotEffect();

      // reset the effect on node
      node.snapshotEffect = undefined;
    }

    // then flush all the dom effects
    for (let i = 0, ln = domEffects.length; i < ln; i++) {
      const node = domEffects[i];
      node.domEffects();

      // reset the effect on node
      node.domEffects = undefined;
    }

    // then flush all the component effects in reverse order
    for (let i = componentEffects.length - 1; i >= 0; i--) {
      const node = componentEffects[i];
      node.componentEffects();

      // reset the effect on node
      node.componentEffects = undefined;
    }

    // after flushing the effect remove the thread from current running thread
    threads.splice();
  }

  stop () {
    cancelIdleCallback(this.idleCallback);
  }
}

export function schedule (node) {
  // in first phase just check if the changes called on existing node
  for (let i = 0, ln = threads.length; i < ln; i++) {
    const currentThread = threads[i];
    if (currentThread.node === node) {
      currentThread.restart();
      return;
    }
  }

  const thread = new Thread(node);
  let pushThread = false;

  // check if thread is child or parent of already running thread
  for (let i = 0, ln = threads.length; i < ln; i++) {
    const currentThread = threads[i];
    const currentNode = currentThread.node;
    /**
     * If a node is a child of already running thread
     * No need to add a new thread just restart the parent thread
     */
    if (currentNode.level > node.level && haveRelation(node, currentNode)) {
      currentThread.restart();
      return;

    /**
     * If the node is parent of already running thread stop those threads
     * and add the parent thread
     */
    } else if (currentNode.level < node.level && haveRelation(currentNode, node)) {
      threads.splice(i, 1);
      i -= 1;
      // mark thread to be added on the thread list
      pushThread = true;

    /**
     * If two threads are on same level it means they might be sibling in which
     * case both threads are unrelated, and can be marked to pushed.
     */
    } else if (currentNode.level === node.level) {
      pushThread = true;
    }
  }

  // if thread is marked to be pushed, add it on thread list and start the thread
  if (pushThread) {
    threads.push(thread);
    thread.start();
  }
}
