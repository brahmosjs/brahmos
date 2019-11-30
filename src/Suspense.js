import Brahmos from './index';
import { Component } from './Component';
import { forwardRef } from './refs';
import createContext from './createContext';

const { Provider, Consumer } = createContext();

export class Suspense extends Component {
  constructor(props) {
    super(props);
    this.state = {
      resolved: true,
    };
    this.lazyElements = [];
  }

  componentDidMount() {
    this.handlePromise();
  }

  componentDidUpdate() {
    this.handlePromise();
  }

  handlePromise() {
    const { lazyElements } = this;
    if (!lazyElements.length) return;

    /**
     * If there are lazy elements wait for all of the lazy element to get resolved
     * and then show children.
     */
    Promise.all(lazyElements).then(res => {
      this.lazyElements = [];
      this.setState({ resolved: true });
    });
  }

  render() {
    const { lazyElements } = this;
    const { fallback, children } = this.props;
    const { resolved } = this.state;

    /**
     * Show fallback till all promise are resolved, and if there are no promise
     * just show the children
     * We pass an array of lazyElement through provider so all lazy elements can
     * add itself to suspense so that suspense can wait for them to resolved.
     */
    return (
      <Provider value={lazyElements}>{resolved ? children : fallback}</Provider>
    );
  }
}

export const lazy = lazyCallback => {
  let Component;
  return forwardRef((props, ref) => {
    return (
      <Consumer>
        {lazyElements => {
          /**
           * if lazy component is already loaded just render it,
           * if not pass the lazy promise to the suspense, so it is aware of promise being resolved.
           */
          if (Component) {
            return <Component {...props} ref={ref} />;
          } else {
            const promise = lazyCallback();
            promise.then(Comp => {
              Component = Comp.default || Comp;
            });
            lazyElements.push(promise);
          }
        }}
      </Consumer>
    );
  });
};
