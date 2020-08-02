import Brahmos, { Suspense, lazy, Component } from '../src';

import TodoList from './TodoList';
import UseStateExample from './UseStateExample';
import ContextExample from './context';
import RefsExample from './RefsExample';
import CreatePortalExample from './createPortalExample';
import SVGExample from './SVGExample';
import LazySuspenseExample from './lazySuspenseExample';
import ErrorBoundaryExample from './ErrorBoundaryExample';

function shuffle(array) {
  array = [...array];
  var currentIndex = array.length;
  var temporaryValue;
  var randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

export function OldApp() {
  return (
    <div>
      {/* <div className="wrapper">
        <h2>Todo List</h2>
        <TodoList />
      </div>
      <div className="wrapper">
        <h2>useState hook example</h2>
        <UseStateExample />
      </div> */}
      {/* <div className="wrapper">
        <h2>Context api example</h2>
        <ContextExample />
      </div> */}
      {/* <div className="wrapper">
        <h2>Refs example</h2>
        <RefsExample />
      </div> */}
      {/* <div className="wrapper">
        <h2>SVG Example</h2>
        <SVGExample />
      </div> */}
      {/* <div className="wrapper">
        <h2>Lazy and Suspense Example</h2>
        <LazySuspenseExample />
      </div> */}
      {/* <div className="wrapper">
        <h2>Error Boundary Example</h2>
        <ErrorBoundaryExample />
      </div> */}
      {/** Keep the portal example on last */}
      <div className="wrapper">
        <h2>CreatePortal Example</h2>
        <CreatePortalExample />
      </div>
    </div>
  );
}

function Div() {
  return <div>askjdkajsdks</div>;
}

function Div2({ length, list }) {
  return (
    <ul>
      {list.slice(0, length).map((val, idx) => (
        <li key={val}>{val}</li>
      ))}
    </ul>
  );
}

export class AppBase extends Component {
  state = {
    name: '',
    list: [1, 2, 3, 4],
  };

  render() {
    const { name, list } = this.state;
    return (
      <div>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            this.setState({ name: e.target.value.slice(0, 10) });

            Brahmos.unstable_deferredUpdates(() => {
              this.setState({ list: shuffle(list) }, null);
            });
            // this.deferredSetState({ list: shuffle(list) }, null);
          }}
        />
        <p>Hello {name}</p> {'Hello World'}
        <Div2 length={name.length} list={list} />
        {name && <Div />}
      </div>
    );
  }
}

export default function App() {
  return (
    <div>
      <OldApp />
    </div>
  );
}
