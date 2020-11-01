// @flow
import { createBrahmosNode, Component } from './circularDep';

import { forwardRef } from './refs';
import { getPromiseSuspendedValue, timestamp, resolvedPromise, isMounted } from './utils';
import {
  PREDEFINED_TRANSITION_DEFERRED,
  getTransitionFromFiber,
  isTransitionCompleted,
} from './transitionUtils';
import { withTransition, deferredUpdates } from './updateUtils';
import reRender from './reRender';
import {
  BRAHMOS_DATA_KEY,
  UPDATE_TYPE_DEFERRED,
  SUSPENSE_REVEAL_INTERVAL,
  TRANSITION_STATE_SUSPENDED,
  TRANSITION_STATE_TIMED_OUT,
  TRANSITION_STATE_RESOLVED,
  TRANSITION_STATE_START,
} from './configs';
import { getCurrentComponentFiber, getFiberFromComponent, setUpdateTime } from './fiber';

import type {
  Fiber,
  Transition,
  AnyTransition,
  SuspenseProps,
  SuspenseListProps,
  SuspenseInstance,
  SuspenseListInstance,
  ClassComponent,
  FunctionalComponent,
} from './flow.types';

type LazyComponentModule = {
  default: ClassComponent | FunctionalComponent,
};

export function getClosestSuspenseFiber(fiber: Fiber, includeSuspenseList: boolean): ?Fiber {
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

export function resetSiblingFibers(fiber: Fiber): Fiber {
  const parentSuspenseFiber = getClosestSuspenseFiber(fiber.parent, true);
  const isSuspenseList =
    parentSuspenseFiber && parentSuspenseFiber.nodeInstance instanceof SuspenseList;

  // if parent is not a suspense list we don't have to do anything
  if (!isSuspenseList) return fiber;

  // $FlowFixMe: This will not come here if parentSuspenseFiber is not present.
  const { nodeInstance: component } = parentSuspenseFiber;
  const { childManagers } = component.suspenseManagers[
    getTransitionFromFiber(fiber, null).transitionId
  ];
  const { revealOrder } = component.props;

  /**
   * If a Suspense is suspended in case of backwards and together we should reset all
   * siblings as dirty as they might need processing again.
   * For forwards revealOrder we don't have to do anything as we in work loop we loop
   * in forward direction only
   */
  if (revealOrder === 'backwards' || revealOrder === 'together') {
    childManagers.forEach((manager) => {
      manager.component[BRAHMOS_DATA_KEY].isDirty = true;
    });

    return childManagers[0].fiber;
  }

  return fiber;
}

function getClosestSuspenseListManager(manager) {
  const { parentSuspenseManager } = manager;
  return parentSuspenseManager && parentSuspenseManager.isSuspenseList
    ? parentSuspenseManager
    : null;
}

// eslint-disable-next-line no-use-before-define
function getSuspenseManager(fiber: Fiber, transition: AnyTransition): SuspenseManager {
  const { nodeInstance: component } = fiber;

  const { suspenseManagers } = component;

  const { transitionId } = transition;

  let suspenseManager = suspenseManagers[transitionId];
  if (!suspenseManager) {
    suspenseManager = suspenseManagers[transitionId] = new SuspenseManager(fiber, transition);
  }

  // if the transition is on start state (restarted), remove the earlier suspender
  if (transition.transitionState === TRANSITION_STATE_START) {
    suspenseManager.suspender = null;
  }

  return suspenseManager;
}

function markComponentDirty(component: SuspenseInstance | SuspenseListInstance) {
  component[BRAHMOS_DATA_KEY].isDirty = true;
}

function markManagerDirty(manager) {
  const fiber = getFiberFromComponent(manager.component);
  if (manager.isUnresolved() && fiber) {
    markComponentDirty(manager.component);
    setUpdateTime(fiber, UPDATE_TYPE_DEFERRED);
  }
}

class SuspenseManager {
  fiber: Fiber;

  component: SuspenseInstance | SuspenseListInstance;

  transition: AnyTransition;

  childManagers: Array<SuspenseManager>;

  suspender: ?Promise<any>;

  isSuspenseList: boolean;

  parentSuspenseManager: ?SuspenseManager;

  rootSuspenseManager: SuspenseManager;

  handleSuspense: () => Promise<any>;

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
    const { root } = getCurrentComponentFiber();
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

    // get the parent of suspenseListManger
    // $FlowFixMe: It comes here only for suspense list, so can be ignored
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

  shouldRenderChildren() {
    const suspenseListManager = getClosestSuspenseListManager(this);
    const { suspender } = this;
    // if there is no closest suspense list manager then return based on it has suspender
    if (!suspenseListManager) return !suspender;

    /**
     * Also, if component is rendered without suspend once, we should not bring it
     * to suspended state
     */
    if (isMounted(this.component) && !suspender) return true;

    /**
     * if parent suspenseList has a reveal order and sibling (based on reveal order)
     * is not resolved yet, we need to wait for the sibling to resolve
     */
    const {
      component: {
        // $FlowFixMe: It comes here only for suspense list, so can be ignored
        props: { revealOrder },
      },
      childManagers,
    } = suspenseListManager;

    const suspenseIndex = childManagers.indexOf(this);

    const hasSuspendedSibling = childManagers.some((manager, index) => {
      const { suspender } = manager;
      if (suspender) {
        return (
          revealOrder === 'together' ||
          (revealOrder === 'forwards' && index <= suspenseIndex) ||
          (revealOrder === 'backwards' && index >= suspenseIndex)
        );
      }

      return false;
    });

    return !hasSuspendedSibling;
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
    markComponentDirty(this.component);

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
      // $FlowFixMe: We have check for not timed out, so error can be ignored
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
      // $FlowFixMe: wip node will always be present after first render
      if (!getFiberFromComponent(component)) targetComponent = this.fiber.root.wip.nodeInstance;

      reRender(targetComponent);
    };

    // trigger rerender on specific intervals
    setTimeout(() => {
      if (transitionTimedOut || !pendingSuspense.includes(component)) {
        deferredUpdates(doSuspenseRerender);
      } else {
        withTransition(transition, doSuspenseRerender);
      }
    }, timestamp() % SUSPENSE_REVEAL_INTERVAL);
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
    // $FlowFixMe: It comes here only for suspense list, so can be ignored
    const { revealOrder = 'together', tail } = component.props;

    // resolve the child managers based on reveal order
    const handleManagerInOrder = (promise, manager) => {
      return promise.then(() => {
        /**
         * If we are doing forward reveal order and have mentioned
         * tail to be collapsed we need to mark the next manager as dirty
         * so that the next component can show loading state
         */
        if (revealOrder === 'forwards' && tail === 'collapsed') {
          markManagerDirty(manager);
        }

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
      let promise = resolvedPromise;
      for (let i = 0, ln = childManagers.length; i < ln; i++) {
        promise = handleManagerInOrder(promise, childManagers[i]);
      }
    } else if (revealOrder === 'backwards') {
      let promise = resolvedPromise;
      for (let i = childManagers.length - 1; i >= 0; i--) {
        promise = handleManagerInOrder(promise, childManagers[i]);
      }
    }

    return allSuspenderPromise;
  }
}

function getActiveTransition(component: SuspenseList): AnyTransition {
  const fiber = getCurrentComponentFiber();
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
  constructor(props: SuspenseListProps) {
    super(props);
    this.suspenseManagers = {};
  }

  render() {
    return this.props.children;
  }
}

export class Suspense extends Component implements SuspenseInstance {
  constructor(props: SuspenseProps) {
    super(props);

    this.suspenseManagers = {};
  }

  handleSuspender(suspender: Promise<any>, suspenseFiber: Fiber) {
    /**
     * $FlowFixMe: We only care about custom transition in this function
     * For predefined transition we don't wait, and we don't have to mark them pending
     */
    const transition: Transition = getActiveTransition(this);

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
    const { fallback, children } = this.props;

    const transition = getActiveTransition(this);
    const fiber = getCurrentComponentFiber();

    const suspenseManager = getSuspenseManager(fiber, transition);

    if (suspenseManager.shouldRenderChildren()) return children;
    else if (suspenseManager.shouldShowFallback()) return fallback;
    else return null;
  }
}

export const lazy = (lazyCallback: () => Promise<LazyComponentModule>) => {
  let componentSuspender;

  const LazyComponent: FunctionalComponent = forwardRef((props, ref) => {
    const ComponentModule = componentSuspender.read();

    // $FlowFixMe: lazy
    return createBrahmosNode(ComponentModule.default, { ...props, ref: ref });
  });

  // assign a method to lazy load to start loading during createBrahmosNode call
  LazyComponent.__loadLazyComponent = () => {
    if (!componentSuspender) componentSuspender = getPromiseSuspendedValue(lazyCallback());
  };

  return LazyComponent;
};
