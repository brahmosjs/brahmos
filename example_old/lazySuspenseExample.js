import Brahmos, { Suspense, lazy } from '../src';
import TodoList from './TodoList';

const LazyToDo = lazy(() => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(import('./TodoList'));
    }, 1000);
  });
});

const LazyUseStateExample = lazy(() => import('./UseStateExample'));

export default function LazySuspenseExample() {
  const message = 'Hello world';

  return (
    <Suspense fallback={<h2>LOADING !!!</h2>}>
      <section className="">
        <h2> Hurray !! </h2>
        <p>{message}</p>
        <LazyToDo />
        <h2> hey !! </h2>
      </section>
      {/** Adding TODOList to check if the lifecycle methods are called */}
      <TodoList />
      <h1>Something</h1>
      <LazyUseStateExample />
    </Suspense>
  );
}
