// @flow

import reRender from './reRender';
import { getConsumerCallback } from './createContext';
import { getUniqueId, timestamp } from './utils';

import {
  UPDATE_TYPE_SYNC,
  UPDATE_TYPE_DEFERRED,
  UPDATE_SOURCE_TRANSITION,
  BRAHMOS_DATA_KEY,
  UPDATE_SOURCE_IMMEDIATE_ACTION,
  TRANSITION_STATE_INITIAL,
  TRANSITION_STATE_START,
  TRANSITION_STATE_TIMED_OUT,
} from './configs';

import {
  getCurrentUpdateSource,
  withUpdateSource,
  withTransition,
  getPendingUpdates,
  getUpdateType,
  guardedSetState,
} from './updateUtils';

import { getFiberFromComponent, getCurrentComponentFiber } from './fiber';

import type {
  Fiber,
  Transition,
  ObjectRef,
  StateCallback,
  ContextType,
  FunctionalComponentUpdate,
} from './flow.types';

type DeferredValueHookOptions = {
  timeoutMs: number,
};

type TransitionOptions = {
  timeoutMs: number,
};

type StateHookResult = [any, (state: any) => any];

type UseTransitionResult = [(cb: Function) => void, boolean];

function getCurrentComponent() {
  return getCurrentComponentFiber().nodeInstance;
}

/**
 * clone hooks, syncHooks to deferredHooks
 */
function cloneHooks(component) {
  const { renderCount } = component[BRAHMOS_DATA_KEY];

  component.deferredHooks = component.syncHooks.map((hook, index) => {
    if (Array.isArray(hook)) {
      return [...hook];
    } else if (hook.transitionId) {
      /**
       * Transition hooks are shared across sync and deferred hooks,
       * so use the same instance of hook don't clone it
       */
      return hook;
      // eslint-disable-next-line no-prototype-builtins
    } else if (hook.hasOwnProperty('current') && renderCount > 1) {
      /**
       * In case of useRef we need to retain the the reference if there if the
       * render is getting called multiple times in one render cycle
       */
      return component.deferredHooks[index] || hook;
    }
    return { ...hook };
  });
}

/**
 * Get the current hooks array based on updateType
 */
function getHooksList(updateType, component) {
  const { syncHooks, deferredHooks } = component;
  return updateType === UPDATE_TYPE_SYNC ? syncHooks : deferredHooks;
}

/**
 * Get the current hooks array from the fiber
 */
function getHooksListFromFiber(fiber) {
  const {
    nodeInstance,
    root: { updateType },
  } = fiber;

  return getHooksList(updateType, nodeInstance);
}

/**
 * Get current hook, based on the type of update we are doing
 * If it is inside transition of deferred update we need deferredHooksList,
 * or else we need the sync hooks list
 */
function getCurrentHook(updateType, hookIndex, component) {
  /**
   * if deferred hooks is not populated clone from the syncHooks
   * This will happen if the component has never been rendered in deferred mode.
   */
  if (updateType === UPDATE_TYPE_DEFERRED && !component.deferredHooks.length) {
    cloneHooks(component);
  }

  const hooks = getHooksList(updateType, component);
  return hooks[hookIndex];
}

/**
 * Method to check if two dependency array are same
 */
function isDependenciesChanged(deps, oldDeps) {
  // if oldDeps or deps are not defined consider it is changed every time
  if (!deps || !oldDeps || deps.length !== oldDeps.length) return true;
  for (let i = 0, ln = deps.length; i < ln; i++) {
    if (deps[i] !== oldDeps[i]) return true;
  }
  return false;
}

/**
 * Function to rerender component if state is changed
 */
function reRenderComponentIfRequired(component, state, lastState) {
  /**
   * check if state are different before rerendering, for seState triggered by event
   * we should always reRerender as event can have some side effects which are controlled
   */
  if (getCurrentUpdateSource() === UPDATE_SOURCE_IMMEDIATE_ACTION || !Object.is(state, lastState)) {
    reRender(component);
  }
}

/**
 * A base method to return hook at specific pointer,
 * and if not available create a new pane
 * We also pass a method to get value from the hook which is passed to the component
 * Plus a method to check if hook has to be updated
 *
 * H: Hook, R: Hook result
 */
function defaultShouldUpdate<H>(hook: H): boolean {
  return false;
}

function defaultReduce<H, R>(hook: H): H | R {
  return hook;
}

function getHook<+H, R>(
  createHook: () => H,
  shouldUpdate: (hook: H) => boolean,
  reduce: (hook: H) => R,
): R {
  const fiber = getCurrentComponentFiber();
  const { nodeInstance: component } = fiber;
  const { pointer } = component;
  const hooks = getHooksListFromFiber(fiber);
  let hook = hooks[pointer];

  // if hook is not there initialize and add it to the pointer
  if (!hook || shouldUpdate(hook)) {
    hook = createHook();
    hooks[pointer] = hook;
  }

  // increment the hook pointer
  component.pointer += 1;
  return reduce(hook);
}

export function prepareHooksForRender() {
  const fiber = getCurrentComponentFiber();
  const {
    nodeInstance: component,
    root: { updateType },
  } = fiber;
  component.pointer = 0;

  // based on update type clone the hooks to deferred hooks
  if (updateType === UPDATE_TYPE_DEFERRED) {
    cloneHooks(component);
  }

  // call all the pending update before trying to render,
  const pendingUpdates = ((getPendingUpdates(fiber): any): Array<FunctionalComponentUpdate>);
  pendingUpdates.forEach((task) => task.updater());
}

/**
 * Base logic for state hooks
 */

function useStateBase(
  initialState: any,
  getNewState: (state: any, lastState: any) => any,
): StateHookResult {
  const component = getCurrentComponent();
  const { pointer: hookIndex } = component;
  return getHook(
    (): StateHookResult => {
      /**
       * create a state hook
       */

      if (typeof initialState === 'function') initialState = initialState();

      const hook = [
        initialState,
        (param: any): void => {
          const updateType = getUpdateType();

          // get committed lastState, which will be up to date in sync hook list
          const currentHook = getCurrentHook(UPDATE_TYPE_SYNC, hookIndex, component);

          const lastState = currentHook[0];
          const state = getNewState(param, lastState);

          const shouldRerender = guardedSetState(component, (transitionId) => ({
            transitionId,
            updater() {
              /**
               * get the hook again inside, as the reference of currentHook might change
               * if we clone sync hook to deferred hook
               */
              const stateHook = getCurrentHook(updateType, hookIndex, component);

              // call getNewState again as currentHook[0] might change if there are multiple setState
              stateHook[0] = getNewState(param, currentHook[0]);
            },
          }));

          if (shouldRerender) reRenderComponentIfRequired(component, state, lastState);
        },
      ];

      return hook;
    },
    defaultShouldUpdate,
    defaultReduce,
  );
}

/**
 * Use state hook
 */
export function useState(initialState: any): [any, StateCallback] {
  return useStateBase(initialState, (state, lastState) => {
    if (typeof state === 'function') state = state(lastState);
    return state;
  });
}

/**
 * Use ref hook
 */
export function useRef(initialValue: any): ObjectRef {
  return getHook(
    (): ObjectRef => {
      /**
       * create a ref hook
       */
      return {
        current: initialValue,
      };
    },
    defaultShouldUpdate,
    defaultReduce,
  );
}

/**
 * Use reducer hook
 */
export function useReducer(
  reducer: (state: any, action: any) => any,
  initialState: any,
  getInitialState: (initialState: any) => any,
): StateHookResult {
  /**
   * If getInitialState method is provided, use that to form correct initial state
   * Or else use passed initialState
   */

  const _initialState = getInitialState ? () => getInitialState(initialState) : initialState;

  return useStateBase(_initialState, (action, lastState) => {
    const state = reducer(lastState, action);
    return state;
  });
}

/**
 * use memo hook
 */
export function useMemo(create: () => any, dependencies: Array<any>): any {
  const createHook = () => {
    return {
      value: create(),
      dependencies,
    };
  };

  const shouldUpdate = (hook) => isDependenciesChanged(dependencies, hook.dependencies);

  const reduce = (hook) => hook.value;

  return getHook(createHook, shouldUpdate, reduce);
}

/**
 * Use callback hook
 */
export function useCallback(callback: Function, dependencies: Array<any>): Function {
  return useMemo(() => callback, dependencies);
}

/**
 * Base module to create effect hooks
 */
function useEffectBase(effectHandler, dependencies) {
  const fiber = getCurrentComponentFiber();
  const { nodeInstance: component } = fiber;
  const { pointer } = component;
  const hooks = getHooksListFromFiber(fiber);

  const lastHook = hooks[pointer] || {
    animationFrame: null,
    cleanEffect: null,
  };

  const hook = {
    ...lastHook,
    isDependenciesChanged: isDependenciesChanged(dependencies, lastHook.dependencies),
    dependencies,
    effect() {
      // if dependency is changed then only call the the effect handler
      if (hook.isDependenciesChanged) {
        effectHandler(hook);
      }
    },
  };

  hooks[pointer] = hook;
  component.pointer += 1;
}

/**
 * Use effect hook
 */
export function useEffect(callback: () => ?Function, dependencies: Array<any>): void {
  useEffectBase((hook) => {
    /**
     * Run effect asynchronously after the paint cycle is finished
     */

    // cancel the previous callback if not yet executed
    cancelAnimationFrame(hook.animationFrame);

    // run affect after next paint
    hook.animationFrame = requestAnimationFrame(() => {
      setTimeout(() => {
        hook.cleanEffect = callback();
      });
    });
  }, dependencies);
}

export function useLayoutEffect(callback: () => ?Function, dependencies: Array<any>): void {
  useEffectBase((hook) => {
    // run effect synchronously
    hook.cleanEffect = callback();
  }, dependencies);
}

/**
 * useDebugValue hook. For now this is just a placeholder,
 * As there is no devtool support it. Revisit it when devtool is supported
 */
export function useDebugValue() {
  // This is just a placeholder for react compatibility
}

/**
 * Create context hook
 */
export function useContext(Context: ContextType): any {
  const { nodeInstance: component, context } = getCurrentComponentFiber();
  const { id, defaultValue } = Context;

  /**
   * $FlowFixMe: Context will always be present in component fiber
   * We have kept it optional for fiber as we don't want to create new object for each fiber
   */
  const provider = context[id];

  const value = provider ? provider.props.value : defaultValue;

  useLayoutEffect(() => {
    // subscribe to provider for the context value change
    if (provider) {
      const { subs } = provider;

      const callback = getConsumerCallback(component);

      subs.push(callback);

      return () => {
        subs.splice(subs.indexOf(callback), 1);
      };
    }
  }, []);

  // store the context value in current component so we can check if value is changed on subscribed callback
  component.context = value;

  return value;
}

/**
 * Transition hook
 */
export function useTransition({ timeoutMs }: TransitionOptions): UseTransitionResult {
  const component = getCurrentComponent();

  return getHook(
    () => {
      /**
       * create a transition hook
       */

      const hook: Transition = {
        transitionId: getUniqueId(),
        tryCount: 0,
        isPending: false,
        transitionTimeout: null,
        pendingSuspense: [],
        transitionState: TRANSITION_STATE_INITIAL,
        clearTimeout() {
          clearTimeout(hook.transitionTimeout);
        },
        updatePendingState(isPending, updateSource) {
          hook.isPending = isPending;

          // mark component to force update as isPending is not treated as state change
          component[BRAHMOS_DATA_KEY].isDirty = true;

          const reRenderCb = () => {
            reRender(component);
          };

          if (updateSource === UPDATE_SOURCE_TRANSITION) {
            withTransition(hook, reRenderCb);
          } else {
            withUpdateSource(updateSource, reRenderCb);
          }
        },
        startTransition(cb: Function) {
          const initialUpdateSource = getCurrentUpdateSource();
          const { root } = getFiberFromComponent(component);

          // reset the transitionState and pending suspense
          hook.transitionState = TRANSITION_STATE_START;
          hook.pendingSuspense = [];

          // clear pending timeout
          hook.clearTimeout();

          // set the transitionId globally so that state updates can get the transition id
          withTransition(hook, cb);

          /**
           * If cb does not have any setState, we don't have to unnecessary
           * set isPending flag, transitionState and trigger reRender.
           */
          if (root.lastDeferredCompleteTime < root.deferredUpdateTime) {
            hook.updatePendingState(true, initialUpdateSource);
          }

          /**
           * Set a timeout which set's the is pending to false and then triggers a deferred update
           */
          hook.transitionTimeout = setTimeout(() => {
            hook.transitionState = TRANSITION_STATE_TIMED_OUT;
            hook.updatePendingState(false, UPDATE_SOURCE_TRANSITION);
          }, timeoutMs);
        },
      };

      return hook;
    },
    defaultShouldUpdate,
    ({ startTransition, isPending }: Transition): UseTransitionResult => [
      startTransition,
      isPending,
    ],
  );
}

/**
 * A hook to have deferred value
 */
export function useDeferredValue(value: any, { timeoutMs }: DeferredValueHookOptions): any {
  const [startTransition] = useTransition({ timeoutMs });
  const [deferredValue, setDeferredValue] = useState(value);
  const timeStampRef = useRef(0);

  /**
   * If there is a timestamp that denotes the timestamp form where the data
   * went stale, timestamp 0 means the data is not stale.
   */
  const { current: staleTime } = timeStampRef;
  const currentTime = timestamp();

  if (value === deferredValue) {
    // if value is not stale reset timestamp
    timeStampRef.current = 0;
  } else if (staleTime === 0) {
    // if the value just got stale mark the stale time
    timeStampRef.current = currentTime;
  } else if (currentTime > staleTime + timeoutMs) {
    // when ever the stale data times out update the deferred value
    timeStampRef.current = 0;
    setDeferredValue(value);
  }

  useEffect(() => {
    startTransition(() => {
      setDeferredValue(value);
    });
  }, [value]);

  return deferredValue;
}

/**
 * Method to run all the effects of a component
 */
export function runEffects(fiber: Fiber) {
  const hooks = getHooksListFromFiber(fiber);

  for (let i = 0, ln = hooks.length; i < ln; i++) {
    const hook = hooks[i];
    if (hook.effect) {
      hook.effect();
    }
  }
}

/**
 * Method to run cleanup all the effects of a component
 */
export function cleanEffects(fiber: Fiber, unmount: boolean): void {
  const hooks = getHooksListFromFiber(fiber);

  for (let i = 0, ln = hooks.length; i < ln; i++) {
    const hook = hooks[i];
    if (hook.cleanEffect && (hook.isDependenciesChanged || unmount)) {
      hook.cleanEffect();
    }

    // clear any pending transitions on unmount
    if (hook.clearTimeout && unmount) {
      hook.clearTimeout();
    }
  }
}
