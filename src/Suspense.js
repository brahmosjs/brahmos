import { createElement, Component } from './circularDep';

import { forwardRef } from './refs';
import { getPromiseSuspendedValue } from './utils';
import {
  TRANSITION_STATE_SUSPENDED,
  TRANSITION_STATE_TIMED_OUT,
  TRANSITION_STATE_RESOLVED,
  PREDEFINED_TRANSITION_DEFERRED,
  getTransitionFromFiber,
  isTransitionCompleted,
} from './transitionUtils';
import { withTransition } from './updateMetaUtils';
import { deferredUpdates } from './deferredUpdates';
import reRender from './reRender';
import { BRAHMOS_DATA_KEY } from './configs';
import { getCurrentFiber } from './fiber';

export function getClosestSuspenseFiber(fiber, includeSuspenseList) {
  const { root } = fiber;
  let { nodeInstance } = fiber;
  while (
    !(
      nodeInstance instanceof Suspense ||
      /* eslint-disable no-unmodified-loop-condition */
      (includeSuspenseList && nodeInstance instanceof SuspenseList)
    )
  ) {
    fiber = fiber.parent;

    if (fiber === root) return null;

    nodeInstance = fiber.nodeInstance;
  }

  return fiber;
}

export function getClosestSuspenseListManager(manager) {
  const { parentSuspenseManager } = manager;
  return parentSuspenseManager && parentSuspenseManager.isSuspenseList
    ? parentSuspenseManager
    : null;
}

function getSuspenseManager(fiber, transition) {
  const { nodeInstance: component } = fiber;
  if (!component) return null;

  const { suspenseManagers } = component;

  const { transitionId } = transition;

  let suspenseManager = suspenseManagers[transitionId];
  if (!suspenseManager) {
    suspenseManager = suspenseManagers[transitionId] = new SuspenseManager(fiber, transition);
  }

  return suspenseManager;
}

class SuspenseManager {
  constructor(fiber, transition) {
    const { nodeInstance } = fiber;
    this.fiber = fiber; // this is just for reference for suspense which gets resolved before committed
    this.component = nodeInstance;
    this.transition = transition;
    this.childManagers = [];
    this.suspender = null;
    this.isSuspenseList = nodeInstance instanceof SuspenseList;

    const parentSuspenseFiber = getClosestSuspenseFiber(fiber.parent, true);
    this.parentSuspenseManager =
      parentSuspenseFiber && getSuspenseManager(parentSuspenseFiber, transition);
    this.rootSuspenseManager = null;
    this.recordChildSuspense();

    // bind handleSuspense
    this.handleSuspense = this.handleSuspense.bind(this);
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

  addRootToProcess() {
    const { rootSuspenseManager } = this;
    const { root } = getCurrentFiber();
    root.afterRender(rootSuspenseManager.handleSuspense);
  }

  suspend(suspender) {
    this.suspender = suspender;

    // mark root suspense to process
    this.addRootToProcess();
  }

  handleSuspense() {
    const { component, suspender } = this;

    const isSuspenseList = component instanceof SuspenseList;

    if (isSuspenseList) {
      return this.handleSuspenseList();
    }

    return Promise.resolve(suspender).then(this.resolve.bind(this, suspender));
  }

  isUnresolved() {
    // if the manager is a suspense list, check if any of the child is unresolved
    // or in case of suspense if has a suspender it means its unresolved.
    if (this.isSuspenseList) {
      return this.childManagers.some((manager) => manager.isUnresolved());
    } else {
      return this.suspender;
    }
  }

  shouldShowFallback() {
    const suspenseListManager = getClosestSuspenseListManager(this);

    // if there is no closest suspense list manager then return true
    if (!suspenseListManager) return true;

    const { component: suspenseList, childManagers: siblingManagers } = suspenseListManager;
    const { tail } = suspenseList.props;

    // get the parent of suspenseListManger
    const parentSuspenseListManager = getClosestSuspenseListManager(suspenseListManager);

    /**
     * If suspense list has another parent suspense list, and the suspense list
     * is marked to not show fallback return false
     *
     * Or else in case of collapsed show the fallback on the first unresolved suspense.
     */
    if (parentSuspenseListManager && !suspenseListManager.shouldShowFallback()) {
      return false;
    } else if (tail === 'collapsed') {
      for (let i = 0, ln = siblingManagers.length; i < ln; i++) {
        const manager = siblingManagers[i];

        /**
         * If any of previous manager is suspended and which is not same as the manager
         * we are testing then return false
         */
        if (tail === 'collapsed' && manager.isUnresolved()) {
          return manager === this;
        }
      }
    }

    return tail !== 'hidden';
  }

  resolve(resolvedWithSuspender) {
    const { component, transition, suspender, childManagers } = this;
    const pendingSuspense = transition.pendingSuspense || [];

    /**
     * if it is resolved with different suspender then current suspender
     * Then no nee to process further
     */
    if (resolvedWithSuspender !== suspender) return;

    /**
     * if there isn't any suspender, child managers may have suspender
     * Loop on child manager and handle their suspense
     */
    if (!suspender) {
      childManagers.forEach((manager) => {
        manager.handleSuspense();
      });
      return;
    }

    // mark the suspense to be resolved and component as dirty
    this.suspender = null;
    this.component[BRAHMOS_DATA_KEY].isDirty = true;

    const transitionTimedOut = transition.transitionState === TRANSITION_STATE_TIMED_OUT;

    // Get the unresolved suspense for the transition.
    const transitionHasUnresolvedSuspense = pendingSuspense.filter(
      (suspense) => suspense.suspenseManagers[transition.transitionId].suspender,
    ).length;

    /**
     * set transition state as resolved if transition is not timed out and it doesn't
     * have any unresolved sibling
     */
    if (!transitionTimedOut && !transitionHasUnresolvedSuspense) {
      transition.transitionState = TRANSITION_STATE_RESOLVED;
    }
    /**
     * If the transition is timed out or the suspense is not part of
     * the transition pendingSuspense list we need to do normal deferred rendering
     * Otherwise do re-render with the transition.
     */
    const doSuspenseRerender = () => {
      let targetComponent = component;
      /**
       * If there is no fiber reference on the component, it means suspense is resolved before commit.
       * In which case there must be some parent which has pending update.
       * So we just need to restart deferred workLoop, which we can do by rerendering from wip fiber.
       */
      if (!component[BRAHMOS_DATA_KEY].fiber) targetComponent = this.fiber.root.wip.nodeInstance;

      reRender(targetComponent);
    };
    if (transitionTimedOut || !pendingSuspense.includes(component)) {
      deferredUpdates(doSuspenseRerender);
    } else {
      withTransition(transition, doSuspenseRerender);
    }
  }

  getChildrenSuspenders() {
    let childSuspenders = [];
    this.childManagers.forEach((manager) => {
      if (manager.isSuspenseList) {
        childSuspenders = childSuspenders.concat(manager.getChildrenSuspenders());
      } else if (manager.suspender) {
        childSuspenders.push(manager.suspender);
      }
    });

    return childSuspenders;
  }

  handleSuspenseList() {
    const { component, childManagers } = this;
    const { revealOrder = 'together' } = component.props;

    // resolve the child managers based on reveal order
    const handleManagerInOrder = (promise, manager) => {
      return promise.then(() => {
        return manager.handleSuspense();
      });
    };

    /**
     * Create a promise which resolves after all the child managers are resolved
     */
    const allSuspenderPromise = Promise.all(this.getChildrenSuspenders());

    /**
     * If reveal order is together we resolve all the manager only
     * when all the suspenders are resolved.
     *
     * In case of forwards and backwards the managers need to resolved
     * in the provided order event the promise resolves concurrently
     */
    if (revealOrder === 'together') {
      allSuspenderPromise.then(() => {
        childManagers.forEach((manager) => manager.handleSuspense());
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

    return allSuspenderPromise;
  }
}

function getActiveTransition(component) {
  const fiber = getCurrentFiber();
  let transition = getTransitionFromFiber(fiber, PREDEFINED_TRANSITION_DEFERRED);

  /**
   * If the transition is resolved and pendingSuspense does not include the instance
   * then use the predefined deferred transition as transition
   * This will happen only when called through handleSuspense
   */
  if (
    transition.transitionState === TRANSITION_STATE_RESOLVED &&
    !transition.pendingSuspense.includes(component)
  ) {
    transition = PREDEFINED_TRANSITION_DEFERRED;
  }

  return transition;
}

export class SuspenseList extends Component {
  constructor(props) {
    super(props);
    this.suspenseManagers = {};
  }

  render() {
    return this.props.children;
  }
}

export class Suspense extends Component {
  constructor(props) {
    super(props);
    this.suspenseManagers = {};
  }

  handleSuspender(suspender, suspenseFiber) {
    const transition = getActiveTransition(this);

    const suspenseManager = getSuspenseManager(suspenseFiber, transition);

    /**
     * Mark current transition as suspended
     * only if transition is not completed or timed out.
     */
    if (!isTransitionCompleted(transition)) {
      /**
       * Add current suspense to pending suspense
       */
      if (!transition.pendingSuspense.includes(this)) {
        transition.pendingSuspense.push(this);
      }

      // Mark the transition as suspended
      transition.transitionState = TRANSITION_STATE_SUSPENDED;
    }

    suspenseManager.suspend(suspender);
  }

  render() {
    const transition = getActiveTransition(this);
    const fiber = getCurrentFiber();

    const suspenseManager = getSuspenseManager(fiber, transition);

    const resolved = !suspenseManager.suspender;
    const { fallback, children } = this.props;

    if (resolved) return children;
    else if (suspenseManager.shouldShowFallback()) return fallback;
    else return null;
  }
}

export const lazy = (lazyCallback) => {
  let componentPromise;

  const LazyComponent = forwardRef((props, ref) => {
    const Component = getPromiseSuspendedValue(componentPromise).read();
    return createElement(Component, { ...props, ref: ref }, props.children);
  });

  // assign a method to lazy load to start loading during createElement call
  LazyComponent.__loadLazyComponent = () => {
    if (!componentPromise) componentPromise = lazyCallback();
  };

  return LazyComponent;
};
