import Brahmos from './index';
import { Component } from './Component';
import { forwardRef } from './refs';
import createContext from './createContext';

const { Provider, Consumer } = createContext();

export class Suspense extends Component {
    state = {
      resolved: true,
    };

    lazyElements = []

    componentDidMount () {
      this.handlePromise();
    }

    componentDidUpdate () {
      this.handlePromise();
    }

    handlePromise () {
      const { lazyElements } = this;
      if (!lazyElements.length) return;

      Promise.all(lazyElements)
        .then((res) => {
          this.lazyElements = [];
          this.setState({ resolved: true });
        });
    }

    render () {
      const { lazyElements } = this;
      const { fallback, children } = this.props;
      const { resolved } = this.state;

      return <Provider value = {lazyElements}>
        {resolved ? children : fallback}
      </Provider>;
    }
}

export const lazy = (lazyCallback) => {
  let Component;
  return forwardRef((props, ref) => {
    return <Consumer>
      {(lazyElements) => {
        if (Component) {
          return <Component {...props} ref={ref}/>;
        } else {
          const promise = lazyCallback();
          promise.then((Comp) => {
            Component = Comp.default || Comp;
          });
          lazyElements.push(promise);
        }
      }}
    </Consumer>;
  });
};
