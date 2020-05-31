import { setCurrentComponent } from './hooks';

export default function functionalComponentInstance(FuncComponent) {
  return {
    syncHooks: [],
    deferredHooks: [],
    __pendingSyncUpdates: [],
    __pendingDeferredUpdates: [],
    __fiber: null,
    __render(props) {
      setCurrentComponent(this);
      const nodes = FuncComponent(props);

      this.__nodes = nodes;
      return nodes;
    },
  };
}
