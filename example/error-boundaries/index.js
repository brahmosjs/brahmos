import Brahmos, { Component } from 'brahmos';
import ReactCredit from '../common/ReactCredit';

// Forked from: https://codepen.io/gaearon/pen/wqvxGa

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  // eslint-disable-next-line handle-callback-err
  componentDidCatch(error, errorInfo) {
    // Catch errors in any components below and re-render with error message
    this.setState({
      errorInfo: errorInfo,
    });
    // You can also log error messages to an error reporting service here
  }

  render() {
    if (this.state.error) {
      // Error path
      return (
        <div>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    // Normally, just render children
    return this.props.children;
  }
}

class BuggyCounter extends Brahmos.Component {
  constructor(props) {
    super(props);
    this.state = { counter: 0 };
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    this.setState(({ counter }) => ({
      counter: counter + 1,
    }));
  }

  render() {
    if (this.state.counter === 5) {
      // Simulate a JS error
      throw new Error('I crashed!');
    }
    return (
      <div>
        <button className="button" onClick={this.handleClick}>
          {this.state.counter}
        </button>
        <br />
        <br />
      </div>
    );
  }
}

export default function ErrorBoundaryExample() {
  return (
    <div>
      <p>
        <b>
          Click on the numbers to increase the counters.
          <br />
          The counter is programmed to throw when it reaches 5. This simulates a JavaScript error in
          a component.
        </b>
      </p>
      <hr />
      <ErrorBoundary>
        <p>
          These two counters are inside the same error boundary. If one crashes, the error boundary
          will replace both of them.
        </p>
        <BuggyCounter />
        <BuggyCounter />
      </ErrorBoundary>
      <hr />
      <p>
        These two counters are each inside of their own error boundary. So if one crashes, the other
        is not affected.
      </p>
      <ErrorBoundary>
        <BuggyCounter />
      </ErrorBoundary>
      <ErrorBoundary>
        <BuggyCounter />
      </ErrorBoundary>

      <ReactCredit name="Error boundaries" link="https://codepen.io/gaearon/pen/wqvxGa" />
    </div>
  );
}
