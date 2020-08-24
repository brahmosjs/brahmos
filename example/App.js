import Brahmos, { useState, useEffect } from 'brahmos';

import BrahmosLogo from './BrahmosLogo';
import TodoList from './todo-list';
import ConcurrentModeDemo from './concurrent-mode';
import SuspenseListDemo from './suspense-list';
import UseDeferredValueDemo from './use-deferred-value';
import UseDeferredValueSuspenseDemo from './use-deferred-value-suspense';
import LazyComponentDemo from './lazy-component';
import PortalDemo from './portals';
import ErrorBoundariesDemo from './error-boundaries';
import SVGDemo from './svg-chart';
import HooksDemo from './hooks';
import ContextDemo from './context-api';

import './App.scss';

const examples = [
  {
    title: 'TODO List',
    id: 'todo-list',
    Component: TodoList,
  },
  {
    title: 'Context API',
    id: 'context-api',
    Component: ContextDemo,
  },
  {
    title: 'Hooks Demo',
    id: 'hooks',
    Component: HooksDemo,
  },
  {
    title: 'Error Boundaries Demo',
    id: 'error-boundaries',
    Component: ErrorBoundariesDemo,
  },
  {
    title: 'SVG Support Demo',
    id: 'svg-support',
    Component: SVGDemo,
  },
  {
    title: 'Portal Demo',
    id: 'portals',
    Component: PortalDemo,
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
    title: 'Suspense with useDeferredValue',
    id: 'use-deferred-value-suspense',
    Component: UseDeferredValueSuspenseDemo,
  },
  {
    title: 'Time slicing with useDeferredValue',
    id: 'use-deferred-value',
    Component: UseDeferredValueDemo,
  },
  {
    title: 'Lazy Component Demo',
    id: 'lazy-component',
    Component: LazyComponentDemo,
  },
];

function getCurrentExample() {
  const currentHash = document.location.hash.replace(/^#/, '');
  const routeIndex = Math.max(
    examples.findIndex((route) => route.id === currentHash),
    0,
  );
  return examples[routeIndex];
}

export default function App() {
  const [currentExample, setCurrentExample] = useState(getCurrentExample);
  const { Component: CurrentComponent, title } = currentExample;

  useEffect(() => {
    window.addEventListener('popstate', () => {
      const newExample = getCurrentExample();
      setCurrentExample(newExample);
    });
  }, []);

  return (
    <div className="app-container">
      <header class="hero is-primary">
        <div class="hero-body">
          <div className="logo">
            <BrahmosLogo width="100" />
          </div>
          <div>
            <h1 class="title">Brahmos Demo</h1>
            <h2 class="subtitle">
              Brahmos is a Super charged UI library with exact same declarative APIs of React. But
              unlike the React's Virtual DOM, Brahmos uses templates internally to separate Static
              and Dynamic parts of an application, and only traverse dynamic parts on updates.
            </h2>
          </div>
        </div>
      </header>
      <div className="body row">
        <aside className="menu has-background-light column is-one-quarter">
          <nav className="menu-list">
            <ul>
              {examples.map((example) => {
                const { title, id } = example;
                return (
                  <li className="menu-list-item">
                    <a href={`#${id}`} className={example === currentExample ? 'is-active' : ''}>
                      {title}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
        <div className="example-container content column">
          <h2>{title}</h2>
          <CurrentComponent />
        </div>
      </div>
    </div>
  );
}
