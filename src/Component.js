import { reRender } from './render';
import { mergeState } from './utils';

export class Component {
  constructor (props) {
    this.props = props;

    this.state = undefined;
    this.__unCommittedState = undefined;

    this.__context = undefined;
    this.context = undefined;

    this.__part = null;
    this.__componentNode = null;
    this.__nodes = null;
    this.__lastNode = null;

    this.__mounted = false;
  }

  setState (newState, callback) {
    /**
     * When setState is called batch all the state changes
     * and call rerender asynchronously as next microTask.
     *
     * If the the newState is function pass the current
     * uncommitted state to it and then merge the new state
     * with uncommitted state.
     */
    let state = this.__unCommittedState || this.state || {};
    const _newState = typeof newState === 'function'
      ? newState(state) : newState;

    state = mergeState(state, _newState);

    this.__unCommittedState = state;

    // when the rerender is done call the callback if provided
    this.__batchStateChange().then(() => {
      if (callback) callback(this.state);
    });
  }

  forceUpdate (callback) {
    reRender(this, 'current');
    if (callback) callback(this.state);
  }

  __batchStateChange () {
    if (this.__updatesPromise) return this.__updatesPromise;

    this.__updatesPromise = Promise.resolve().then(() => {
      this.__updatesPromise = null;
      /**
       * reRender only if there are uncommitted state
       * __unCommittedState state may have have been applied by
       * force update or calling render method on parent node.
       */
      if (this.__unCommittedState) reRender(this);
    });
    return this.__updatesPromise;
  }

  __render () {
    // get the new rendered node
    const nodes = this.render();

    // store the current reference of nodes so we can use this on the next render cycle
    this.__nodes = nodes;
    return nodes;
  }
}

export class PureComponent extends Component {};
