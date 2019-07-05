import associateInstance from './associateInstance';
import { reRender } from './render';
import { mergeState } from './utils';

export class Component {
  constructor (props) {
    this.props = props;
  }
  setState (newState, callback) {
    let state = this.__unCommittedState || this.state || {};
    const _newState = typeof newState === 'function'
      ? newState(state) : newState;

    state = mergeState(state, _newState);

    this.__unCommittedState = state;

    this.__batchStateChange().then(() => {
      if (callback) callback(this.state);
    });
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

    // associate instance from the old node to the new rendered node
    associateInstance(nodes, this.__nodes);

    // store the current reference of nodes so we can use this this on next render cycle
    this.__nodes = nodes;
    return nodes;
  }
}

export class PureComponent extends Component {};
