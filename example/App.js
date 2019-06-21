import Brahmos from '../src';

import TodoList from './TodoList';
import UseStateExample from './UseStateExample';
import ContextExample from './context';

export default function App () {
  return (
    <div>
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
    </div>
  );
}
