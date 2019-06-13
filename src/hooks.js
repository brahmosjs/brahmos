import updater from './updater';

let currentComponent;

/**
 * Method to check if two dependency array are same
 */
function isDependenciesChanged (deps, oldDeps) {
  // if oldDeps or deps are not defined consider it is changed every time
  if (!deps || !oldDeps || deps.length !== oldDeps.length) return true;
  for (let i = 0, ln = deps.length; i < ln; i++) {
    if (deps[i] !== oldDeps[i]) return true;
  }
  return false;
}

/**
 * Function to update component if state is changed
 */
function updateComponentIfRequired (component, state, lastState) {
  if (!Object.is(state, lastState)) {
    const { __part: part, __componentNode: node } = component;
    updater([part], [node], [], true);
  }
}

/**
 * A base method to return hook at specific pointer,
 * and if not available create a new pane
 * We also pass a method to get value from the hook which is passed to the component
 * Plus a method to check if hook has to be updated
 */
function getHook (createHook, shouldUpdate = hook => false, reduce = hook => hook) {
  const { pointer, hooks } = currentComponent;
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
export function setCurrentComponent (component) {
  currentComponent = component;
  component.pointer = 0;
  component.hooks = component.hooks || [];
}

/**
 * Use state hook
 */
export function useState (initialState) {
  const component = currentComponent;
  return getHook(() => {
    /**
     * create a state hook
     */
    const hook = [initialState, (state) => {
      const lastState = hook[0];
      hook[0] = state;
      updateComponentIfRequired(component, state, lastState);
    }];

    return hook;
  });
}

/**
 * Use ref hook
 */
export function useRef (initialValue) {
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
export function useReducer (reducer, initialState, getInitialState) {
  const component = currentComponent;

  return getHook(() => {
    /**
     * If getInitialState method is provided, use that to form correct initial state
     * Or else use passed initialState
     */
    const _initialState = getInitialState ? getInitialState(initialState) : initialState;

    // create a reducer hook
    const hook = [_initialState, (action) => {
      const lastState = hook[0];
      const state = reducer(lastState, action);
      hook[0] = state;

      updateComponentIfRequired(component, state, lastState);
    }];

    return hook;
  });
}

/**
 * use memo hook
 */
export function useMemo (create, dependencies) {
  const createHook = () => {
    return {
      value: create(),
      dependencies,
    };
  };

  const shouldUpdate = hook => isDependenciesChanged(dependencies, hook.dependencies);

  const reduce = hook => hook.value;

  return getHook(createHook, shouldUpdate, reduce);
}

/**
 * Use callback hook
 */
export function useCallback (callback, dependencies) {
  return useMemo(() => callback, dependencies);
}

/**
 * Base module to create effect hooks
 */
function useEffectBase (effectHandler, dependencies) {
  const { pointer, hooks } = currentComponent;
  const lastHook = hooks[pointer] || {};

  const hook = {
    ...lastHook,
    isDependenciesChanged: isDependenciesChanged(dependencies, lastHook.dependencies),
    dependencies,
    effect () {
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
export function useEffect (callback, dependencies) {
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

export function useLayoutEffect (callback, dependencies) {
  useEffectBase((hook) => {
    // run effect synchronously
    hook.cleanEffect = callback();
  }, dependencies);
}

/**
 * useDebugValue hook. For now this is just a placeholder,
 * As there is no devtool support it. Revisit it when devtool is supported
 */
export function useDebugValue () {
  // This is just a placeholder for react compatibility
}

/**
 * Method to run all the effects of a component
 */
export function runEffects (component) {
  const { hooks } = component;
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
export function cleanEffects (component, unmount) {
  const { hooks } = component;
  for (let i = 0, ln = hooks.length; i < ln; i++) {
    const hook = hooks[i];
    if (hook.cleanEffect && (hook.isDependenciesChanged || unmount)) {
      hook.cleanEffect();
    }
  }
}
