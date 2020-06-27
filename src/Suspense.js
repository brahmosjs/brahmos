import { createElement, Component } from './circularDep';

import { forwardRef } from './refs';
import { getPromiseSuspendedValue } from './utils';
import {
  TRANSITION_STATE_SUSPENDED,
  TRANSITION_STATE_TIMED_OUT,
  TRANSITION_STATE_RESOLVED,
  PREDEFINED_TRANSITION_DEFERRED,
  getTransitionFromFiber,
  TRANSITION_STATE_START,
  isTransitionCompleted,
} from './transitionUtils';
import { withTransition } from './updateMetaUtils';
import { deferredUpdates } from './deferredUpdates';
import reRender from './reRender';
import { BRAHMOS_DATA_KEY } from './configs';

export function getClosestSuspense(fiber, includeSuspenseList) {
  const { root } = fiber;
  let { componentInstance } = fiber.node;
  while (
    !(
      componentInstance instanceof Suspense ||
      /* eslint-disable no-unmodified-loop-condition */
      (includeSuspenseList && componentInstance instanceof SuspenseList)
    )
  ) {
    fiber = fiber.parent;

    if (fiber === root) return;

    componentInstance = fiber.node.componentInstance;
  }

  return componentInstance;
}

function getActiveTransition(component) {
  const { fiber } = component[BRAHMOS_DATA_KEY];
  const currentTransition = getTransitionFromFiber(fiber);
  return isTransitionCompleted(currentTransition)
    ? PREDEFINED_TRANSITION_DEFERRED
    : currentTransition;
}

function getSuspenseManager(component, transition) {
  if (!component) return null;

  const { suspenseManagers } = component;

  const { transitionId } = transition;

  let suspenseManager = suspenseManagers[transitionId];
  if (!suspenseManager) {
    suspenseManager = suspenseManagers[transitionId] = new SuspenseManager(component, transition);
  }

  return suspenseManager;
}

class SuspenseManager {
  constructor(component, transition) {
    this.component = component;
    this.transition = transition;
    this.childManagers = [];
    this.suspender = null;
    this.showFallback = true;
    this.resolved = true;
    const parentFiber = component[BRAHMOS_DATA_KEY].fiber.parent;
    this.parentSuspenseManager = getSuspenseManager(
      getClosestSuspense(parentFiber, true),
      transition,
    );
    this.rootSuspenseManager = null;
    this.recordChildSuspense();
    this.resolve = this.resolve.bind(this);
  }

  recordChildSuspense() {
    const { parentSuspenseManager } = this;
    if (parentSuspenseManager) {
      parentSuspenseManager.childManagers.push(this);
      this.rootSuspenseManager = parentSuspenseManager.rootSuspenseManager;
    } else {
      this.rootSuspenseManager = this;
    }
  }

  getPendingManagers() {
    const { component, transition } = this;
    const { transitionId } = transition;
    const { pendingSuspenseMangers: allPendingManagers } = component[BRAHMOS_DATA_KEY].fiber.root;

    let pendingManagers = allPendingManagers[transitionId];
    if (!pendingManagers) {
      allPendingManagers[transitionId] = pendingManagers = [];
    }
    return { allPendingManagers, pendingManagers };
  }

  addRootToProcess() {
    const { rootSuspenseManager } = this;

    const { pendingManagers } = this.getPendingManagers();

    if (rootSuspenseManager && !pendingManagers.includes(rootSuspenseManager)) {
      pendingManagers.push(rootSuspenseManager);
    }
  }

  resolve() {
    const { suspender, component, transition, childManagers, parentSuspenseManager } = this;
    const { pendingManagers, allPendingManagers } = this.getPendingManagers();

    // mark the suspense as resolved and component as dirty
    this.resolved = true;
    component[BRAHMOS_DATA_KEY].isDirty = true;

    // if it does not have any suspender no need to do any thing and just resolve the child managers
    if (suspender) {
      const managerIndex = pendingManagers.indexOf(this.rootSuspenseManager);

      const hasUnresolvedSiblings =
        parentSuspenseManager &&
        parentSuspenseManager.childManagers.filter((managers) => !managers.resolved).length;

      console.log(
        'Inside resolve ----',
        component.props.fallback.template.strings,
        managerIndex,
        pendingManagers,
      );

      /**
       * If there are no unresolved siblings, we can resolve the
       * transition from here only, other child suspense can be resolved
       * later
       * For that remove the rootManagers from pending managers
       */
      if (!hasUnresolvedSiblings && managerIndex !== -1) {
        pendingManagers.splice(managerIndex, 1);
      }

      // reset the suspender
      this.suspender = null;

      /**
       * If a transition is timed out, we need to always have to deferred update
       * Non custom transitions are timed out by default
       */
      if (transition.transitionState === TRANSITION_STATE_TIMED_OUT) {
        deferredUpdates(() => reRender(component));
        /**
         * if the pendingManagers count for a transition becomes 0 it means we mark the transition as complete
         * and then do rerender.
         */
      } else if (pendingManagers.length === 0) {
        // if the transition is done with pending managers, remove the transition from pending transitions
        delete allPendingManagers[transition.transitionId];

        // set transition state as resoled
        transition.transitionState = TRANSITION_STATE_RESOLVED;
        transition.resetIsPending();
        withTransition(transition, () => reRender(component));
      }
    }

    // handle the child suspense after the rerender has started
    /**
     * NOTE: All child need to be resolved together
     */
    childManagers.forEach((manager) => {
      manager.handleSuspense();
    });
  }

  suspend(suspender) {
    this.resolved = false;
    this.suspender = suspender;

    this.addRootToProcess();
  }

  handleSuspense() {
    const { component, suspender } = this;

    const isSuspenseList = component instanceof SuspenseList;

    if (isSuspenseList) {
      this.handleSuspenseList();
    } else {
      Promise.resolve(suspender).then(this.resolve);
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

    const managerSuspender = (manager) => Promise.resolve(manager.suspender);

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
    this.suspenseManagers = {};
  }

  handleSuspender(suspender) {
    const transition = getActiveTransition(this);

    const suspenseManager = getSuspenseManager(this, transition);

    /**
     * Mark current transition as suspended only if transition has started,
     * if its already resolved, completed or timed out, it can't go back to
     * suspended state
     */
    if (transition.transitionState === TRANSITION_STATE_START) {
      transition.transitionState = TRANSITION_STATE_SUSPENDED;
    }

    suspenseManager.suspend(suspender);

    console.log(
      'transition -------',
      this.props.fallback.template.strings,
      transition,
      suspenseManager.rootSuspenseManager,
    );
  }

  render() {
    const transition = getActiveTransition(this);

    const { resolved, showFallback } = getSuspenseManager(this, transition);
    const { fallback, children } = this.props;

    console.log(fallback.template.strings, resolved, showFallback, Date.now());
    if (resolved) return children;
    else if (showFallback) return fallback;
    else return null;
  }
}

export const lazy = (lazyCallback) => {
  let componentPromise;

  const LazyComponent = forwardRef((props, ref) => {
    const Component = getPromiseSuspendedValue(componentPromise).read();
    return createElement(Component, { ...props, ref: ref }, props.children);
  });

  LazyComponent.__loadLazyComponent = () => {
    if (!componentPromise) componentPromise = lazyCallback();
  };

  return LazyComponent;
};
