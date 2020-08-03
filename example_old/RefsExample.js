import Brahmos, { Component, createRef, forwardRef } from '../src';

class Child extends Component {
  logSomething() {
    // console.log('something');
  }

  render() {
    return <div>Hello World!!</div>;
  }
}

const ChildWithForwardedRef = forwardRef((props, ref) => {
  return <div ref={ref}>Forwarded Ref</div>;
});

export default class RefsExample extends Component {
  constructor() {
    super();
    this.childCreateRef = createRef();
    this.domCreateRef = createRef();
    this.forwardedRef = createRef();
  }

  logRefs = () => {
    console.log(this.childCreateRef);
    console.log(this.childCallbackRef);
    console.log(this.domCreateRef);
    console.log(this.domCbRef);
    console.log(this.forwardedRef);
  };

  render() {
    return (
      <div>
        <Child ref={this.childCreateRef} />
        <Child
          ref={(instance) => {
            this.childCallbackRef = instance;
          }}
        />
        <div ref={this.domCreateRef}>Dom create ref</div>
        <div
          ref={(elm) => {
            this.domCbRef = elm;
          }}
        >
          Dom callback ref
        </div>
        <ChildWithForwardedRef ref={this.forwardedRef} />
        <button onClick={this.logRefs}>Log refs</button>
      </div>
    );
  }
}
