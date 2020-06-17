import { setCurrentComponent } from './hooks';
import { brahmosDataKey } from './configs';

export default function functionalComponentInstance(FuncComponent) {
  return {
    syncHooks: [],
    deferredHooks: [],
    __render(props) {
      setCurrentComponent(this);
      const nodes = FuncComponent(props);

      this[brahmosDataKey].nodes = nodes;
      return nodes;
    },
    // keep the dynamic attributes on last so it's transpiled in compact way
    [brahmosDataKey]: {
      pendingSyncUpdates: [],
      pendingDeferredUpdates: [],
      fiber: null,
      nodes: null,
      isForceUpdate: false,
    },
  };
}
