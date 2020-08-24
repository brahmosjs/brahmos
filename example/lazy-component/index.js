import Brahmos, { Suspense, lazy } from 'brahmos';

const LazyTodoList = lazy(() => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(import('../todo-list/index'));
    }, 1500);
  });
});

export default function LazyExample() {
  return (
    <Suspense fallback={<h2>Loading TodoList !!!</h2>}>
      <h2> This Todo list is loaded lazily. </h2>
      <LazyTodoList showDescription={false} />
    </Suspense>
  );
}
