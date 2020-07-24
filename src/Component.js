import reRender from './reRender';
import { getUpdateType, getPendingUpdatesKey, getCurrentTransition } from './updateMetaUtils';
import { BRAHMOS_DATA_KEY } from './configs';

export class Component {
  constructor(props) {
    this.props = props;

    this.state = undefined;
    this[BRAHMOS_DATA_KEY] = {
      lastSnapshot: null,
      pendingSyncUpdates: [],
      pendingDeferredUpdates: [],
      fiber: null,
      nodes: null,
      mounted: false,
      committedValues: {},
      isDirty: false,
    };

    this.context = undefined;
  }

  setState(newState, callback, type) {
    const updateType = getUpdateType();
    /**
     * When setState is called batch all the state changes
     * and call rerender asynchronously as next microTask.
     *
     * If the the newState is function pass the current
     * uncommitted state to it and then merge the new state
     * with uncommitted state.
     */

    const stateMeta = {
      state: newState,
      transitionId: getCurrentTransition().transitionId,
      callback,
    };

    const pendingUpdateKey = getPendingUpdatesKey(updateType);

    this[BRAHMOS_DATA_KEY][pendingUpdateKey].push(stateMeta);

    reRender(this);
  }

  forceUpdate(callback) {
    const brahmosData = this[BRAHMOS_DATA_KEY];

    // if there is no fiber (when component is not mounted) we don't need to do anything
    const { fiber } = brahmosData;
    if (!fiber) return;

    // keep the track of component through which force update is started
    fiber.root.forcedUpdateWith = this;

    this[BRAHMOS_DATA_KEY].isDirty = true;
    reRender(this);
    if (callback) callback(this.state);
  }

  __handleError() {}

  __render() {
    // get the new rendered node
    const nodes = this.render();

    // store the current reference of nodes so we can use this this on next render cycle
    this[BRAHMOS_DATA_KEY].nodes = nodes;
    return nodes;
  }
}

export function isClassComponent(element) {
  return element.prototype instanceof Component;
}

export class PureComponent extends Component {}
