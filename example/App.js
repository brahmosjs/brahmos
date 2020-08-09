import Brahmos, { render, Component, useState } from '../src';
import TodoList from './todo-list/TodoList';
import SierpinskiTriangleDemo from './sierpinski-triangle';
import ConcurrentModeDemo from './concurrent-mode';
import SuspenseListDemo from './suspense-list';
import SVGDemo from './svg-chart';

import './App.scss';

const examples = [
  {
    title: 'TODO List',
    id: 'todo-list',
    Component: TodoList,
  },
  {
    title: 'Sierpinski Triangle Demo',
    id: 'sierpinski-triangle',
    Component: SierpinskiTriangleDemo,
  },
  {
    title: 'Concurrent Mode Demo',
    id: 'concurrent-mode',
    Component: ConcurrentModeDemo,
  },
  {
    title: 'Suspense List Demo',
    id: 'suspense-list',
    Component: SuspenseListDemo,
  },
  {
    title: 'SVG Chart',
    id: 'svg-chart',
    Component: SVGDemo,
  },
];

export default function App() {
  const [CurrentComponent, setCurrentComponent] = useState(() => examples[0].Component);

  return (
    <div className="app-container">
      <header className="header">
        <h1>Brahmos Examples</h1>
      </header>
      <div className="body">
        <nav className="nav-list">
          <ul className="nav-list-container">
            {examples.map(({ title, id, Component }) => {
              return (
                <li class="nav-list-item">
                  <a href={`#${id}`} onClick={() => setCurrentComponent(() => Component)}>
                    {title}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="component-container">
          <CurrentComponent />
        </div>
      </div>
    </div>
  );
}
