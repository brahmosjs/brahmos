// @flow
import { prepareHooksForRender } from './hooks';
import { BRAHMOS_DATA_KEY } from './configs';
import type { FunctionalComponentInstance, ObjectLiteral } from './flow.types';

export default function functionalComponentInstance(
  FuncComponent: Function,
): FunctionalComponentInstance {
  return {
    syncHooks: [],
    deferredHooks: [],
    context: undefined,
    pointer: 0,
    __render(props: ObjectLiteral) {
      prepareHooksForRender();
      const nodes = FuncComponent(props);

      this[BRAHMOS_DATA_KEY].nodes = nodes;
      return nodes;
    },
    // keep the dynamic attributes on last so it's transpiled in compact way
    [BRAHMOS_DATA_KEY]: {
      pendingSyncUpdates: [],
      pendingDeferredUpdates: [],
      fiber: null,
      nodes: null,
      isDirty: false,
      mounted: false,
      renderCount: 0,
    },
  };
}
