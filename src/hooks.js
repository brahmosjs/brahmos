import updater from './updater';

let currentComponent;

export function setCurrentComponent (component) {
  currentComponent = component;
  component.pointer = 0;
  component.hooks = component.hooks || [];
}

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

export function useState (initialState) {
  const component = currentComponent;
  return getHook(() => {
    /**
     * create a state hook
     */
    const hook = [initialState, (state) => {
      hook[0] = state;
      const { __part: part, __componentNode: node } = component;
      updater([part], [node], [], true);
    }];

    return hook;
  });
}
