import { Component } from './Component';
import { reRender } from './render';

let ctxId = 1;

export function getConsumerCallback (component) {
  return function (value) {
    /**
     * NOTE: This might have to be changed when async rendering is in place
     */
    setTimeout(() => {
      if (component.context !== value) {
        component.context = value;
        reRender(component);
      }
    });
  };
}

export default function createContext (defaultValue) {
  const id = `cC${ctxId++}`;

  class Provider extends Component {
    constructor (props) {
      super(props);
      this.subs = [];
    }
    shouldComponentUpdate (nextProp) {
      const { value, subs } = this.props;
      if (value !== nextProp.value) {
        subs.forEach(cb => cb(nextProp.value));
      }
    }
    sub (component) {
      const { subs } = this;
      const callback = getConsumerCallback(component);

      subs.push(callback);

      const { componentWillUnmount } = component;

      component.componentWillUnmount = () => {
        subs.splice(subs.indexOf(callback), 1);
        if (componentWillUnmount) componentWillUnmount();
      };
    }
    render () {
      return this.props.children;
    }
  }

  // add metadata for provider
  Provider.__ccId = id;

  /**
   * consumer component which subscribes to provider on initialization
   * and unsubscribe on component unmount
   */
  class Consumer extends Component {
    render () {
      this.props.children(this.context);
    }
  };

  const context = {
    id,
    defaultValue,
    Provider,
    Consumer,
  };

  // add contextType information on Consumer
  Consumer.contextType = true;

  return context;
}
