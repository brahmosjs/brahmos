import Brahmos, {lazy, Suspense} from '../src';

import TodoList from './TodoList';
import UseStateExample from './UseStateExample';
import ContextExample from './context';
import RefsExample from './RefsExample';
import CreatePortalExample from './createPortalExample';
import SVGExample from './SVGExample';

const LazyToDo = lazy(import('./TodoList'));
const MistakeLazyToDo = lazy(TodoList);
const LazyUseStateExample = lazy(import('./UseStateExample'));

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
      <div className="wrapper">
        <h2>Refs example</h2>
        <RefsExample />
      </div>
      <div className="wrapper">
        <h2>SVG Example</h2>
        <SVGExample/>
      </div>
      <div className="wrapper">
        <h2>CreatePortal Example</h2>
        <CreatePortalExample/>
      </div>
       <Suspense fallback = {<h2>LOADING !!!</h2>}>
        <LazyToDo />
        <MistakeLazyToDo />
        <LazyUseStateExample />
       </Suspense>
    </div>
  );
}
