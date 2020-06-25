import { setCurrentComponent } from './hooks';
import { BRAHMOS_DATA_KEY } from './configs';

export default function functionalComponentInstance(FuncComponent) {
  return {
    syncHooks: [],
    deferredHooks: [],
    __render(props) {
      setCurrentComponent(this);
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
      isForceUpdate: false,
      mounted: false,
    },
  };
}
