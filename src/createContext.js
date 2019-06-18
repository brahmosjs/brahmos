import { Component } from './Component';

let ctxId = 1;

export function createContext (defaultValue) {
  const id = `cC${ctxId++}`;

  /**
   * Provider component, it has method to subscribe/unsubscribe the provider
   */
  class Provider extends Component {
    constructor (props) {
      super(props);
      this.subs = [];
    }
    subscribe (cb) {
      this.subs.push(cb);
    }
    unSubscribe (cb) {
      const { subs } = this;
      subs.splice(subs.indexOf(cb), 1);
    }
    shouldComponentUpdate (nextProp) {
      const { value } = this.props;
      if (value !== nextProp.value) {
        this.subs.forEach(cb => cb(nextProp.value));
      }
    }
    render () {
      return this.props.children;
    }
  }

  // add metadata for provider
  Provider.__isContextProvider = true;
  Provider.ccId = id;

  /**
   * consumer component which subscribes to provider on initialization
   * and unsubscribe on component unmount
   */
  class Consumer extends Component {
    constructor (props) {
      super(props);
      const { provider } = props;

      this.subscriptionCallback = (contextValue) => {
        /**
         * TODO: This needs to be changed when async rendering is in place
         */
        setTimeout(() => {
          if (this.state.contextValue !== contextValue) {
            this.setState({ contextValue });
          }
        });
      };

      provider.subscribe(this.subscriptionCallback);
    }
    static getDerivedStateFromProps ({ provider }) {
      return {
        contextValue: provider ? provider.props.value : defaultValue,
      };
    }
    componentWillUnmount () {
      const { provider } = this.props;
      provider && provider.unSubscribe(this.subscriptionCallback);
    }
    render () {
      this.props.children(this.state.contextValue);
    }
  };

  // add metadata for consumer
  Consumer.__isContextConsumer = true;
  Consumer.ccId = id;

  return {
    Provider,
    Consumer,
  };
}
