import Brahmos from '../src';

import TodoList from './TodoList';
import UseStateExample from './UseStateExample';
import ContextExample from './context';
import RefsExample from './RefsExample';
import CreatePortalExample from './createPortalExample';
import SVGExample from './SVGExample';

function Circle ({ children }) {
  return (
    <circle cx="50" cy="50" r="40" stroke="green" stroke-width={4} fill="yellow" />
  );
}

export default function App () {
  return (
    <div>
      {/**
      <div className="wrapper">
        <h2>Todo List</h2>
        <TodoList />
      </div>
      <div className="wrapper">
        <h2>useState hook example</h2>
        <UseStateExample />
      </div>
      <div className="wrapper">
        <h2>Context api example</h2>
        <ContextExample />
      </div>
      <div className="wrapper">
        <h2>Refs example</h2>
        <RefsExample />
      </div>
      <div className="wrapper">
        <h2>CreatePortal Example</h2>
        <CreatePortalExample/>
      </div>
      */}
      {/* <SVGExample /> */}
      <svg width="100" height="100">
        <circle cx="50" cy="50" r="40" stroke="green" stroke-width={4} fill="yellow" />
        <Circle />
      </svg>
      <svg viewBox="0 0 160 40" xmlns="http://www.w3.org/2000/svg">
        <a xlinkHref="https://developer.mozilla.org/"><text x="10" y="25">MDN Web Docs</text></a>
      </svg>
    </div>
  );
}
