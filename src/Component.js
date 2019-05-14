import associateInstance from './associateInstance';
import updater from './updater';

export class Component {
  constructor (props, context) {
    this.props = props;
    this.context = context;
  }
  setState (newState, callback) {
    if (typeof newState === 'function') {
      this.state = newState(this.state);
    } else {
      this.state = { ...(this.state || {}), ...newState };
    }

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
    const nodes = this.__render(this.props);
    const { __part: part } = this;
    updater([part], [nodes]);
  }
  __render (props) {
    if (props !== this.props) {
      this.props = props;
      // call the life cycles
    }
    // get the new rendered node
    const nodes = this.render();

    // associate instance from the old node to the new rendered node
    associateInstance(nodes, this.__nodes);

    // store the current reference of nodes so we can use this this on next render cycle
    this.__nodes = nodes;
    return nodes;
  }
}
