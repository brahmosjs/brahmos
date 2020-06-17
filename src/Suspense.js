import { createElement, Component } from './circularDep';

import { forwardRef } from './refs';
import { getPromiseSuspendedValue } from './utils';
import {
  TRANSITION_STATE_SUSPENDED,
  TRANSITION_STATE_TIMED_OUT,
  TRANSITION_STATE_RESOLVED,
  getTransitionFromFiber,
} from './transitionUtils';
import { withTransition } from './updateMetaUtils';
import { deferredUpdates } from './deferredUpdates';
import reRender from './reRender';
import { brahmosDataKey } from './configs';

export function getClosestSuspense(fiber, includeSuspenseList) {
  const { root } = fiber;
  let { componentInstance } = fiber;
  while (
    fiber !== root &&
    !(
      componentInstance instanceof Suspense ||
      /* eslint-disable no-unmodified-loop-condition */
      (includeSuspenseList && componentInstance instanceof SuspenseList)
    )
  ) {
    fiber = fiber.parent;
    componentInstance = fiber.componentInstance;
  }

  return componentInstance;
}

function getSuspenseManager(component) {
  if (!component) return null;

  const {
    suspenseManagers,
    [brahmosDataKey]: { fiber },
  } = component;

  const currentTransition = getTransitionFromFiber(fiber);
  const { transitionId } = currentTransition;

  let suspenseManager = suspenseManagers[transitionId];
  if (!suspenseManager) {
    suspenseManager = suspenseManagers[transitionId] = new SuspenseManager(component, transitionId);
  }

  return suspenseManager;
}

class SuspenseManager {
  constructor(component, transitionId) {
    this.component = component;
    this.transitionId = transitionId;
    this.childManagers = [];
    this.suspenders = [];
    this.showFallback = true;
    this.resolved = true;
    const parentFiber = component[brahmosDataKey].fiber.parent;
    this.parentSuspenseManager = getSuspenseManager(getClosestSuspense(parentFiber, true));
    this.rootSuspenseManager = null;
    this.recordChildSuspense();
    this.resolve = this.resolve.bind(this);
  }

  recordChildSuspense() {
    const { parentSuspenseManager } = this;
    if (parentSuspenseManager) {
      parentSuspenseManager.push(this);
      this.rootSuspenseManager = parentSuspenseManager.rootSuspenseManager;
    } else {
      this.rootSuspenseManager = parentSuspenseManager;
    }
  }

  getPendingManagers() {
    const { component, transitionId } = this;
    const { pendingSuspenseMangers } = component[brahmosDataKey].fiber.root;

    let pendingManagers = pendingSuspenseMangers[transitionId];
    if (!pendingManagers) {
      pendingSuspenseMangers[transitionId] = pendingManagers = [];
    }
    return pendingManagers;
  }

  addRootToProcess() {
    const { rootSuspenseManager } = this;

    const pendingManagers = this.getPendingManagers();

    if (!pendingManagers.includes(rootSuspenseManager)) {
      pendingManagers.push(rootSuspenseManager);
    }
  }

  resolve() {
    const { suspenders, childManagers } = this;
    const pendingManagers = this.getPendingManagers();

    const currentTransition = getTransitionFromFiber(this.component[brahmosDataKey].fiber);

    // mark the suspense as resolved
    this.resolved = true;

    // hasSuspenders
    const hadSuspenders = suspenders.length;
    const managerIndex = pendingManagers.indexOf(this.rootSuspenseManager);

    /**
     * If there were any suspenders it means we can resolve the
     * transition from here only, other child suspense can be resolved
     * later
     * For that remove the rootManagers from pending managers
     */
    if (hadSuspenders && managerIndex !== -1) {
      pendingManagers.splice(managerIndex);
    }

    // reset the suspenders array
    suspenders.length = 0;

    /**
     * If a transition is timed out, we need to always have to deferred update
     * Non custom transitions are timed out by default
     */
    if (hadSuspenders && currentTransition.transitionState === TRANSITION_STATE_TIMED_OUT) {
      deferredUpdates(reRender.bind(this));
      /**
       * if the pendingManagers count for a transition becomes 0 it means we mark the transition as complete
       * and then do rerender.
       */
    } else if (hadSuspenders && pendingManagers.length === 0) {
      // set transition state as resoled
      currentTransition.transitionState = TRANSITION_STATE_RESOLVED;
      currentTransition.resetIsPending();
      withTransition(currentTransition, reRender.bind(this));
    }

    // handle the child suspense after the rerender has started
    childManagers.forEach((manager) => {
      manager.handleSuspense();
    });
  }

  suspend(suspender) {
    const { suspenders } = this;
    this.resolved = false;
    suspenders.push(suspender);

    this.addRootToProcess();
  }

  handleSuspense() {
    const { component, suspender } = this;

    const isSuspenseList = component instanceof SuspenseList;

    if (isSuspenseList) {
      this.handleSuspenseList();
    } else {
      Promise.all(suspender).then(this.resolve);
    }
  }

  handleSuspenseList() {
    const { component, childManagers } = this;
    const { revealOrder = 'together', tail } = component;

    /**
     *  set show fallback of all child managers based on tail prop
     *  by default all fallbacks will be shown.
     *  In collapsed mode only one unresolved suspense's fallback will be shown
     */
    let showFallback = tail !== 'hidden';
    childManagers.forEach((manager) => {
      if (tail === 'collapsed' && !manager.resolved) {
        showFallback = false;
      }

      manager.showFallback = showFallback;
    });

    // resolve the child managers based on reveal order

    const managerSuspender = (manager) => Promise.all(manager.suspenders);

    const handleManagerInOrder = (promise, manager) => {
      return promise.then(() => {
        return managerSuspender(manager).then(() => {
          manager.resolve();
        });
      });
    };

    /**
     * If reveal order is together we resolve all the manager only
     * when all the suspenders are resolved.
     *
     * In case of forwards and backwards the managers need to resolved
     * in the provided order event the promise resolves concurrently
     */
    if (revealOrder === 'together') {
      Promise.all(childManagers.map(managerSuspender)).then(() => {
        childManagers.forEach((manager) => {
          manager.resolve();
        });
      });
    } else if (revealOrder === 'forwards') {
      let promise = Promise.resolve();
      for (let i = 0, ln = childManagers.length; i < ln; i++) {
        promise = handleManagerInOrder(promise, childManagers[i]);
      }
    } else if (revealOrder === 'backwards') {
      let promise = Promise.resolve();
      for (let i = childManagers.length - 1; i >= 0; i--) {
        promise = handleManagerInOrder(promise, childManagers[i]);
      }
    }
  }
}

export class SuspenseList extends Component {
  render() {
    return this.props.children;
  }
}

export class Suspense extends Component {
  constructor(props) {
    super(props);
    this.resolved = true;
    this.suspenseManagers = {};
  }

  handleSuspender(suspender) {
    const { fiber } = this[brahmosDataKey];
    const currentTransition = getTransitionFromFiber(fiber);

    const suspenseManager = getSuspenseManager(this);

    /**
     * Mark current transition as suspended
     */
    if (currentTransition.transitionState !== TRANSITION_STATE_TIMED_OUT) {
      currentTransition.transitionState = TRANSITION_STATE_SUSPENDED;
    }

    suspenseManager.suspend(suspender);
  }

  render() {
    const { resolved, showFallback } = getSuspenseManager(this);
    const { fallback, children } = this.props;

    if (resolved) return children;
    else if (showFallback) return fallback;
    else return null;
  }
}

export const lazy = (lazyCallback) => {
  let componentPromise;
  return forwardRef((props, ref) => {
    if (!componentPromise) componentPromise = lazyCallback();
    const Component = getPromiseSuspendedValue(componentPromise).read();
    return createElement(Component, { ...props, ref: ref }, props.children);
  });
};
