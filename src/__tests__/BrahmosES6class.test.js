/*
Forked from -
https://github.com/facebook/react/blob/master/packages/react/src/__tests__/ReactES6Class-test.js

TODO: Simplify this specs.
*/
import Brahmos, { render } from '..';
import { sleep } from './testUtils';

describe('BrahmosES6Class', () => {
  let container;
  const freeze = function (expectation) {
    Object.freeze(expectation);
    return expectation;
  };
  let Inner;
  let attachedListener = null;
  let attachedListenerWithCallback = null;
  let renderedName = null;
  beforeEach(() => {
    attachedListener = null;
    attachedListenerWithCallback = null;
    renderedName = null;
    container = document.createElement('div');
    Inner = class extends Brahmos.Component {
      getName() {
        return this.props.name;
      }

      render() {
        attachedListenerWithCallback = (callback) => this.props.onClick(callback);
        attachedListener = this.props.onClick;
        renderedName = this.props.name;
        return <div className={this.props.name} />;
      }
    };
  });

  function test(element, expectedTag, expectedClassName) {
    const instance = render(element, container);
    expect(container.firstChild).not.toBeNull();
    expect(container.firstChild.tagName).toBe(expectedTag);
    expect(container.firstChild.className).toBe(expectedClassName);
    return instance;
  }

  it('preserves the name of the class for use in error messages', () => {
    class Foo extends Brahmos.Component {}
    expect(Foo.name).toBe('Foo');
  });

  it('renders a simple stateless component with prop', () => {
    class Foo extends Brahmos.Component {
      render() {
        return <Inner name={this.props.bar} />;
      }
    }
    test(<Foo bar="foo" />, 'DIV', 'foo');
    test(<Foo bar="bar" />, 'DIV', 'bar');
  });

  it('renders based on state using initial values in this.props', () => {
    class Foo extends Brahmos.Component {
      constructor(props) {
        super(props);
        this.state = { bar: this.props.initialValue };
      }

      render() {
        return <span className={this.state.bar} />;
      }
    }
    test(<Foo initialValue="foo" />, 'SPAN', 'foo');
  });

  it('renders based on state using props in the constructor', () => {
    class Foo extends Brahmos.Component {
      constructor(props) {
        super(props);
        this.state = { bar: props.initialValue };
      }

      changeState() {
        this.setState({ bar: 'bar' });
      }

      render() {
        if (this.state.bar === 'foo') {
          return <div className="foo" />;
        }
        return <span className={this.state.bar} />;
      }
    }
    const instance = test(<Foo initialValue="foo" />, 'DIV', 'foo');
    instance.changeState();
    test(<Foo />, 'SPAN', 'bar');
  });

  it('sets initial state with value returned by static getDerivedStateFromProps', () => {
    class Foo extends Brahmos.Component {
      state = {};

      static getDerivedStateFromProps(nextProps, prevState) {
        return {
          foo: nextProps.foo,
          bar: 'bar',
        };
      }

      render() {
        return <div className={`${this.state.foo} ${this.state.bar}`} />;
      }
    }
    test(<Foo foo="foo" />, 'DIV', 'foo bar');
  });

  it('updates initial state with values returned by static getDerivedStateFromProps', () => {
    class Foo extends Brahmos.Component {
      state = {
        foo: 'foo',
        bar: 'bar',
      };

      static getDerivedStateFromProps(nextProps, prevState) {
        return {
          foo: `not-${prevState.foo}`,
        };
      }

      render() {
        return <div className={`${this.state.foo} ${this.state.bar}`} />;
      }
    }
    test(<Foo />, 'DIV', 'not-foo bar');
  });

  it('renders updated state with values returned by static getDerivedStateFromProps', () => {
    class Foo extends Brahmos.Component {
      state = {
        value: 'initial',
      };

      static getDerivedStateFromProps(nextProps, prevState) {
        if (nextProps.update) {
          return {
            value: 'updated',
          };
        }
        return null;
      }

      render() {
        return <div className={this.state.value} />;
      }
    }
    test(<Foo update={false} />, 'DIV', 'initial');
    test(<Foo update={true} />, 'DIV', 'updated');
  });

  it('should render with null in the initial state property', () => {
    class Foo extends Brahmos.Component {
      constructor() {
        super();
        this.state = null;
      }

      render() {
        return <span />;
      }
    }
    test(<Foo />, 'SPAN', '');
  });

  it('setState through an event handler', () => {
    class Foo extends Brahmos.Component {
      constructor(props) {
        super(props);
        this.state = { bar: props.initialValue };
      }

      handleClick(callback) {
        this.setState({ bar: 'bar' }, () => callback());
      }

      render() {
        return <Inner name={this.state.bar} onClick={this.handleClick.bind(this)} />;
      }
    }
    test(<Foo initialValue="foo" />, 'DIV', 'foo');
    attachedListenerWithCallback(() => expect(renderedName).toBe('bar'));
    // Passed the test as a callback
  });

  it('should not implicitly bind event handlers', () => {
    class Foo extends Brahmos.Component {
      constructor(props) {
        super(props);
        this.state = { bar: props.initialValue };
      }

      handleClick() {
        this.setState({ bar: 'bar' });
      }

      render() {
        return <Inner name={this.state.bar} onClick={this.handleClick} />;
      }
    }
    test(<Foo initialValue="foo" />, 'DIV', 'foo');
    expect(attachedListener).toThrow();
  });

  it('will call all the normal life cycle methods', () => {
    let lifeCycles = [];
    class Foo extends Brahmos.Component {
      constructor() {
        super();
        this.state = {};
      }

      componentDidMount() {
        lifeCycles.push('did-mount');
      }

      shouldComponentUpdate(nextProps, nextState) {
        lifeCycles.push('should-update', nextProps, nextState);
        return true;
      }

      componentDidUpdate(prevProps, prevState) {
        lifeCycles.push('did-update', prevProps, prevState);
      }

      componentWillUnmount() {
        lifeCycles.push('will-unmount');
      }

      render() {
        return <span className={this.props.value} />;
      }
    }
    class Outer extends Brahmos.Component {
      constructor(props) {
        super(props);
        this.state = {
          isFooVisible: this.props.visible,
        };
      }

      unmountFoo(callback) {
        this.setState(
          {
            isFooVisible: false,
          },
          () => callback,
        );
      }

      render() {
        if (this.state.isFooVisible) {
          return <Foo value={this.props.value} />;
        }
        return <div />;
      }
    }
    test(<Outer visible value="foo" />, 'SPAN', 'foo');
    expect(lifeCycles).toEqual(['did-mount']);
    lifeCycles = []; // reset
    const instance = test(<Outer visible value="bar" />, 'SPAN', 'bar');
    expect(lifeCycles).toEqual([
      'should-update',
      freeze({ value: 'bar' }),
      {},
      'did-update',
      freeze({ value: 'foo' }),
      {},
    ]);
    lifeCycles = []; // reset
    instance.unmountFoo(() => expect(lifeCycles).toEqual(['will-unmount']));
  });

  it('renders using forceUpdate even when there is no state', async () => {
    class Foo extends Brahmos.Component {
      constructor(props) {
        super(props);
        this.mutativeValue = props.initialValue;
      }

      handleClick(callback) {
        this.mutativeValue = 'bar';
        this.forceUpdate(() => callback());
      }

      render() {
        return <Inner name={this.mutativeValue} onClick={this.handleClick.bind(this)} />;
      }
    }
    test(<Foo initialValue="foo" />, 'DIV', 'foo');
    attachedListenerWithCallback(() => {});
    await sleep(10);
    expect(renderedName).toBe('bar');
  });
});
