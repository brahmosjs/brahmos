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
  isTransitionResolved,
} from './transitionUtils';
import { withTransition, withUpdateSource } from './updateMetaUtils';
import { deferredUpdates } from './deferredUpdates';
import reRender from './reRender';
import { BRAHMOS_DATA_KEY } from './configs';
import { getFiberFromComponent } from './fiber';

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

    if (fiber === root) return null;

    componentInstance = fiber.node.componentInstance;
  }

  return componentInstance;
}

export function getClosestSuspenseList(fiber) {
  const closestSuspense = getClosestSuspense(fiber, true);

  return closestSuspense instanceof SuspenseList ? closestSuspense : null;
}

export function getClosestSuspenseListManager(manager) {
  const { parentSuspenseManager } = manager;
  return parentSuspenseManager.isSuspenseList ? parentSuspenseManager : null;
}

// function getActiveTransition(component) {
//   const fiber = getFiberFromComponent(component);
//   const currentTransition = getTransitionFromFiber(fiber);
//   // console.log('+++++++++++++', currentTransition, isTransitionCompleted(currentTransition));
//   return isTransitionResolved(currentTransition)
//     ? PREDEFINED_TRANSITION_DEFERRED
//     : currentTransition;
// }

class SuspenseManagerOld {
  constructor(component, transition) {
    this.component = component;
    this.transition = transition;
    this.childManagers = [];
    this.suspender = null;
    this.isSuspenseList = component instanceof SuspenseList;

    const { parent: parentFiber } = getFiberFromComponent(component);
    this.parentSuspenseManager = getSuspenseManager(
      getClosestSuspense(parentFiber, true),
      transition,
    );
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
    const { rootSuspenseManager, component } = this;
    const { root } = getFiberFromComponent(component);
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
      this.handleSuspenseList();
    } else {
      Promise.resolve(suspender).then((data) => {
        // console.log(data);
        this.resolve(suspender);
      });
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
    if (parentSuspenseListManager && !suspenseListManager.showFallback()) {
      return false;
    } else if (tail === 'collapsed') {
      for (let i = 0, ln = siblingManagers.length; i < ln; i++) {
        const manager = siblingManagers[i];

        /**
         * If any of previous manager is suspended and which is not same as the manager
         * we are testing then return false
         */
        if (tail === 'collapsed' && manager.suspender) {
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
    component[BRAHMOS_DATA_KEY].isDirty = true;

    const transitionTimedOut = transition.transitionState === TRANSITION_STATE_TIMED_OUT;

    // Get the unresolved suspense for the transition.
    const transitionHasUnresolvedSuspense = pendingSuspense.filter(
      (suspense) => getSuspenseManager(suspense, transition).suspender,
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
    if (transitionTimedOut || !pendingSuspense.includes(component)) {
      deferredUpdates(() => reRender(component));
    } else {
      withTransition(transition, () => reRender(component));
    }
  }

  handleSuspenseList() {
    const { component, childManagers } = this;
    const { revealOrder = 'together' } = component.props;

    /**
     * get binded resolvers for child managers,
     * so manager know, with which suspender its resolved
     */
    const getChildResolver = (manager, suspender) => manager.resolve.bind(manager, suspender);

    // resolve the child managers based on reveal order
    const handleManagerInOrder = (promise, manager) => {
      const { suspender } = manager;
      /**
       * get binded resolvers for child managers,
       * so manager know, with which suspender its resolved
       */
      const resolver = getChildResolver(manager, suspender);

      return promise.then(() => {
        return suspender.then(() => {
          resolver();
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
      const suspenders = childManagers.map((manager) => manager.suspender);
      Promise.all(suspenders).then(() => {
        childManagers.forEach((manager, index) => {
          const resolver = getChildResolver(manager, suspenders[index]);
          resolver();
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

function getActiveTransition(component) {
  const fiber = getFiberFromComponent(component);
  let transition = getTransitionFromFiber(fiber);

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

function getSuspenseManager(component, transition) {
  if (!component) return null;

  transition = transition || getActiveTransition(component);

  const { suspenseManagers } = component;

  const { transitionId } = transition;

  let suspenseManager = suspenseManagers[transitionId];
  if (!suspenseManager) {
    suspenseManager = suspenseManagers[transitionId] = new SuspenseManagerOld(
      component,
      transition,
    );
  }

  return suspenseManager;
}

export class SuspenseManager {
  constructor(component, transition) {
    this.component = component;
    this.transition = transition;
    this.suspender = null;
    this.showFallback = true;
  }

  suspend(suspender) {
    const { root } = getFiberFromComponent(this.component);

    this.suspender = suspender;
    // console.log('suspended times', suspender);
    // TODO: If there is suspense we should wait for the render cycle to finish and then only resolve.
    root.afterRender(() => {
      suspender.then(this.resolveHandler.bind(this, suspender));
    });
  }

  resolveHandler(resolvedWithSuspender, data) {
    const { component, transition, suspender } = this;
    const pendingSuspense = transition.pendingSuspense || [];

    if (resolvedWithSuspender !== suspender) return;

    // mark the suspense to be resolved and component as dirty
    this.suspender = null;
    component[BRAHMOS_DATA_KEY].isDirty = true;

    const transitionTimedOut = transition.transitionState === TRANSITION_STATE_TIMED_OUT;

    // Get the unresolved suspense for the transition.
    const transitionHasUnresolvedSuspense = pendingSuspense.filter(
      (suspense) => getSuspenseManager(suspense, transition).suspender,
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
    if (transitionTimedOut || !pendingSuspense.includes(component)) {
      deferredUpdates(() => reRender(component));
    } else {
      withTransition(transition, () => reRender(component));
    }
  }
}

export class SuspenseList extends Component {
  constructor(props) {
    super(props);
    this.managers = {};
    this.orchestrators = {};
  }

  getOrchestratorForTransition(transitionId) {
    const { orchestrators } = this;

    if (!orchestrators[transitionId]) {
      orchestrators[transitionId] = this.orchestrateManagers.bind(this, transitionId);
    }

    return orchestrators[transitionId];
  }

  getChildManagers(transitionId) {
    const { managers } = this;
    if (!managers[transitionId]) managers[transitionId] = [];

    return managers[transitionId];
  }

  orchestrateFallback(transitionId) {
    const {
      props: { tail },
      managers,
    } = this;
    const childManagers = managers[transitionId] || [];

    const parentSuspenseList = getClosestSuspenseList(getFiberFromComponent(this));
    /**
     *  set show fallback of all child managers based on tail prop
     *  by default all fallbacks will be shown.
     *  In collapsed mode only one unresolved suspense's fallback will be shown
     *
     *  As SuspenseList can be composed we need to check parent SuspenseList as well to
     *  to get the initial value of showFallback
     */
    let showFallback = parentSuspenseList
      ? parentSuspenseList.orchestrateFallback(transitionId)
      : tail !== 'hidden';

    childManagers.forEach((manager) => {
      if (tail === 'collapsed' && !manager.resolved) {
        showFallback = false;
      }

      manager.showFallback = showFallback;
    });

    return showFallback;
  }

  orchestrateManagers(transitionId) {
    const childManagers = this.getChildManagers(transitionId);

    const parentSuspenseList = getClosestSuspenseList(getFiberFromComponent(this));
    return new Promise((resolve, reject) => {
      const parentPromise = parentSuspenseList
        ? parentSuspenseList.orchestrateManagers()
        : Promise.resolve();
    });
  }

  getOrchestratedSuspender(suspenseManager) {
    const { transition } = suspenseManager;
    const { transitionId } = transition;
    const childManagers = this.getChildManagers(transitionId);
    const suspenseListFiber = getFiberFromComponent(this);
    const { root } = suspenseListFiber;
    const orchestrator = this.getOrchestratorForTransition(transitionId);

    // push the suspenseManager to manager list for the transition
    childManagers.push(suspenseManager);

    return new Promise((resolve, reject) => {
      suspenseManager.resolve = resolve;
      root.afterRender(orchestrator);
    });
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

  handleSuspender(suspender) {
    const transition = getActiveTransition(this);

    const suspenseManager = getSuspenseManager(this);

    console.log(
      '++++++++++++',
      transition.transitionState,
      suspender,
      this.props.fallback.template.strings,
    );

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
    // console.log('render', transition);
    const suspenseManager = getSuspenseManager(this);

    const resolved = !suspenseManager.suspender;
    const { fallback, children } = this.props;

    // console.log(
    //   'inside render',
    //   fallback.template.strings,
    //   transition.transitionState,
    //   suspender,
    //   showFallback,
    //   Date.now(),
    // );
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
