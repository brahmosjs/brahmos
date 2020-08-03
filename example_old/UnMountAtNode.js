import Brahmos, { Component, unmountComponentAtNode } from '../src';

export default class UnMountAtNode extends Component {
  removeNode = () => {
    setTimeout(() => {
      unmountComponentAtNode(document.getElementById('unmount-node'));
    }, 1000);
  };

  componentWillUnmount() {
    // console.log('component will unmount life cycle called!!');
  }

  render() {
    return (
      <div>
        <p>
          {' '}
          Remove a mounted Brahmos component from the DOM and clean up its event handlers and state.
          If no component was mounted in the container, calling this function does nothing. Returns
          true if a component was unmounted and false if there was no component to unmount.{' '}
        </p>
        <div>
          <button onClick={this.removeNode}> Remove node</button>
        </div>
      </div>
    );
  }
}
