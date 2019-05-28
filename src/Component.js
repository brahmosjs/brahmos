import associateInstance from './associateInstance';
import updater from './updater';
import { mergeState } from './utils';

export class Component {
  constructor (props, context) {
    this.props = props;
    this.context = context;
  }
  setState (newState, callback) {
    let state = this.__unCommittedState || this.state || {};
    const _newState = typeof newState === 'function'
      ? newState(state) : newState;

    state = mergeState(state, _newState);

    this.__unCommittedState = state;

    this.__batchStateChange().then((state) => {
      this.__updatesPromise = null;
      this.__applyUpdates();
      if (callback) callback(state);
    });
  }
  __batchStateChange () {
    if (this.__updatesPromise) return this.__updatesPromise;
    this.__updatesPromise = new Promise((resolve) => {
      resolve(this.state);
    });
    return this.__updatesPromise;
  }
  __applyUpdates () {
    const { __part: part, __componentNode: node } = this;
    updater([part], [node]);
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
