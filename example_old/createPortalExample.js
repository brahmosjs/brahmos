import Brahmos, { Component, createPortal, useState } from '../src';

class Child extends Component {
  componentWillUnmount() {
    // console.log('unmounted');
  }

  render() {
    return <div>Hello New Root!</div>;
  }
}

function CreatePortalExample() {
  const [display, setDisplay] = useState(true);
  return (
    <div>
      {display && createPortal(<Child />, document.querySelector('#another-root'))}
      <button
        onClick={() => {
          setDisplay(!display);
        }}
      >
        Toggle
      </button>
    </div>
  );
}

export default CreatePortalExample;
