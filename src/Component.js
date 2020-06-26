import reRender from './reRender';
import {
  UPDATE_SOURCE_FORCE_UPDATE,
  withUpdateSource,
  getUpdateType,
  getPendingUpdatesKey,
  getCurrentTransition,
} from './updateMetaUtils';
import { BRAHMOS_DATA_KEY } from './configs';

export class Component {
  constructor(props) {
    this.props = props;

    this.state = undefined;
    this[BRAHMOS_DATA_KEY] = {
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
    withUpdateSource(UPDATE_SOURCE_FORCE_UPDATE, () => {
      this[BRAHMOS_DATA_KEY].isDirty = true;
      reRender();
      if (callback) callback(this.state);
    });
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
