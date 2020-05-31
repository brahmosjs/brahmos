import { reRender } from './render';
import {
  UPDATE_SOURCE_FORCE_UPDATE,
  withUpdateSource,
  getUpdateType,
  getPendingUpdatesKey,
  currentTransition,
} from './updateMetaUtils';

export class Component {
  constructor(props) {
    this.props = props;

    this.state = undefined;
    this.__pendingSyncUpdates = [];
    this.__pendingDeferredUpdates = [];

    this.context = undefined;

    this.__fiber = null;
    this.__componentNode = null;
    this.__nodes = null;
    this.__lastNode = null;

    this.__mounted = false;
    this.__brahmosNode = null;
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
      transitionId: currentTransition.transitionId,
      callback,
    };

    const pendingUpdateKey = getPendingUpdatesKey(updateType);

    this[pendingUpdateKey].push(stateMeta);

    reRender(this);
  }

  forceUpdate(callback) {
    withUpdateSource(UPDATE_SOURCE_FORCE_UPDATE, () => {
      reRender();
      if (callback) callback(this.state);
    });
  }

  __render() {
    // get the new rendered node
    const nodes = this.render();

    // store the current reference of nodes so we can use this this on next render cycle
    this.__nodes = nodes;
    return nodes;
  }
}

export class PureComponent extends Component {}
