import updater from './updater';

let currentComponent;

export function setCurrentComponent (component) {
  currentComponent = component;
  component.pointer = 0;
  component.hooks = component.hooks || [];
}

/**
 * A base method to return hook at specific pointer,
 * and if not available create a new pne
 */
function getHook (createHook) {
  const { pointer, hooks } = currentComponent;
  let hook = hooks[pointer];

  // if hook is not there initialize and add it to the pointer
  if (!hook) {
    hook = createHook();
    hooks[pointer] = hook;
  }

  // increment the hook pointer
  currentComponent.pointer += 1;
  return hook;
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
