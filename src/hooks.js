import reRender from './reRender';
import { getConsumerCallback } from './createContext';
import { getUniqueId } from './utils';

import {
  UPDATE_TYPE_SYNC,
  UPDATE_TYPE_DEFERRED,
  UPDATE_SOURCE_TRANSITION,
  BRAHMOS_DATA_KEY,
} from './configs';

import {
  getCurrentUpdateSource,
  withUpdateSource,
  withTransition,
  getPendingUpdatesKey,
  getCurrentTransition,
  getPendingUpdates,
  getUpdateType,
} from './updateMetaUtils';

import { TRANSITION_STATE_INITIAL, TRANSITION_STATE_START } from './transitionUtils';
import { getFiberFromComponent } from './fiber';

/**
 * TODO: Rename currentComponent to currentComponentInstance
 * and component to component
 */

let currentComponent;

/**
 * get updateType from component
 */
function getUpdateTypeFromComponent(component) {
  return getFiberFromComponent(component).root.updateType;
}

/**
 * clone hooks, syncHooks to deferredHooks
 */
function cloneHooks(component) {
  component.deferredHooks = component.syncHooks.map((hook, index) => {
    if (Array.isArray(hook)) {
      return [...hook];
    } else if (hook.transitionId) {
      /**
       * Transition hooks are shared across sync and deferred hooks,
       * so use the same instance of hook don't clone it
       */
      return hook;
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
 * Get current hook, based on the type of update we are doing
 * If it is inside transition of deferred update we need deferredHooksList,
 * or else we need the sync hooks list
 */
function getCurrentHook(updateType, hookIndex, component) {
  /**
   * if deferred hooks is not populated clone from the syncHooks
   * This will only happen when component is rendered only once.
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
  if (!Object.is(state, lastState)) {
    reRender(component);
  }
}

/**
 * A base method to return hook at specific pointer,
 * and if not available create a new pane
 * We also pass a method to get value from the hook which is passed to the component
 * Plus a method to check if hook has to be updated
 */
function getHook(createHook, shouldUpdate = (hook) => false, reduce = (hook) => hook) {
  const { pointer } = currentComponent;
  const updateType = getUpdateTypeFromComponent(currentComponent);
  const hooks = getHooksList(updateType, currentComponent);
  let hook = hooks[pointer];

  // if hook is not there initialize and add it to the pointer
  if (!hook || shouldUpdate(hook)) {
    hook = createHook();
    hooks[pointer] = hook;
  }

  // increment the hook pointer
  currentComponent.pointer += 1;
  return reduce(hook);
}

/**
 * Method to set the current component while rendering the components
 */
export function setCurrentComponent(component) {
  currentComponent = component;
  component.pointer = 0;

  // based on update type clone the hooks to deferred hooks
  const updateType = getUpdateTypeFromComponent(component);
  if (updateType === UPDATE_TYPE_DEFERRED) {
    cloneHooks(component);
  }

  // call all the pending update before trying to render,
  const pendingUpdates = getPendingUpdates(updateType, component);
  pendingUpdates.forEach((task) => task.updater());
}

/**
 * Base logic for state hooks
 */

function useStateBase(initialState, getNewState) {
  const component = currentComponent;
  const { pointer: hookIndex } = component;
  return getHook(() => {
    /**
     * create a state hook
     */

    if (typeof initialState === 'function') initialState = initialState();

    const hook = [
      initialState,
      (param) => {
        const updateType = getUpdateType();
        const currentHook = getCurrentHook(updateType, hookIndex, component);

        const lastState = currentHook[0];
        const state = getNewState(param, lastState);

        const pendingUpdatesKey = getPendingUpdatesKey(updateType);

        const stateMeta = {
          transitionId: getCurrentTransition().transitionId,
          updater() {
            /**
             * get the hook again inside, as the reference of currentHook might change
             * if we clone sync hook to deferred hook
             */
            const stateHook = getCurrentHook(updateType, hookIndex, component);

            // call getNewState again as currentHook[0] might change if there are multiple setState
            stateHook[0] = getNewState(param, currentHook[0]);
          },
        };
        component[BRAHMOS_DATA_KEY][pendingUpdatesKey].push(stateMeta);
        reRenderComponentIfRequired(component, state, lastState);
      },
    ];

    return hook;
  });
}

/**
 * Use state hook
 */
export function useState(initialState) {
  return useStateBase(initialState, (state, lastState) => {
    if (typeof state === 'function') state = state(lastState);
    return state;
  });
}

/**
 * Use ref hook
 */
export function useRef(initialValue) {
  return getHook(() => {
    /**
     * create a ref hook
     */
    return {
      current: initialValue,
    };
  });
}

/**
 * Use reducer hook
 */
export function useReducer(reducer, initialState, getInitialState) {
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
export function useMemo(create, dependencies) {
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
export function useCallback(callback, dependencies) {
  return useMemo(() => callback, dependencies);
}

/**
 * Base module to create effect hooks
 */
function useEffectBase(effectHandler, dependencies) {
  const { pointer, hooks } = currentComponent;
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
  currentComponent.pointer += 1;
}

/**
 * Use effect hook
 */
export function useEffect(callback, dependencies) {
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

export function useLayoutEffect(callback, dependencies) {
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
export function useContext(Context) {
  const { id, defaultValue } = Context;
  const { __context: context } = currentComponent;
  const provider = context[id];

  const value = provider ? provider.props.value : defaultValue;

  useLayoutEffect(() => {
    // subscribe to provider for the context value change
    if (provider) {
      const { subs } = provider;

      const callback = getConsumerCallback(currentComponent);

      subs.push(callback);

      return () => {
        subs.splice(subs.indexOf(callback), 1);
      };
    }
  }, []);

  // store the context value in current component so we can check if value is changed on subscribed callback
  currentComponent.context = value;

  return value;
}

/**
 * Transition hook
 */
export function useTransition({ timeoutMs }) {
  const component = currentComponent;

  return getHook(
    () => {
      /**
       * create a transition hook
       */

      const hook = {
        transitionId: getUniqueId(),
        isPending: false,
        transitionTimeout: null,
        pendingSuspense: [],
        transitionState: TRANSITION_STATE_INITIAL,
        clearTimeout() {
          clearTimeout(hook.transitionTimeout);
        },
        updatePendingState(isPending, updateSource) {
          hook.isPending = isPending;

          // mark component to force update as isPending is not treated as state
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
        startTransition(cb) {
          const initialUpdateSource = getCurrentUpdateSource();
          // console.log('started transition. *************');
          const { root } = getFiberFromComponent(component);

          // reset the transitionState and pending suspense
          hook.transitionState = TRANSITION_STATE_START;
          hook.pendingSuspense = [];

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
          /**
           * TODO: UNCOMMENT THIS:
           */
          // hook.transitionTimeout = setTimeout(() => {
          //   hook.transitionState = TRANSITION_STATE_TIMED_OUT;
          //   hook.updatePendingState(false, UPDATE_SOURCE_TRANSITION);
          // }, timeoutMs);
        },
      };

      return hook;
    },
    undefined,
    ({ startTransition, isPending }) => [startTransition, isPending],
  );
}

/**
 * Method to run all the effects of a component
 */
export function runEffects(component) {
  const updateType = getUpdateTypeFromComponent(component);
  const hooks = getHooksList(updateType, component);

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
export function cleanEffects(component, unmount) {
  const updateType = getUpdateTypeFromComponent(component);
  const hooks = getHooksList(updateType, component);

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
