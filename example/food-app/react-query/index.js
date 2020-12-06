import { StrictMode } from 'brahmos';
import { QueryCache, ReactQueryCacheProvider } from 'react-query';

import App from './App';

import '../food-app.css';

const queryCache = new QueryCache({
  defaultConfig: {
    queries: {
      staleTime: 300000, // 5 minutes
    },
  },
});

export default function ReduxExample() {
  return (
    <StrictMode>
      <p>
        This demo demonstrates Brahmos compatibility with React Query and Zustand.
        <br />
        The example is forked from{' '}
        <a
          href="https://github.com/itaditya/redux-hooks-for-food-delivery/tree/aditya-redux-to-rq-zustand"
          target="_blank"
        >
          https://github.com/itaditya/redux-hooks-for-food-delivery/tree/aditya-redux-to-rq-zustand
        </a>
      </p>
      <ReactQueryCacheProvider queryCache={queryCache}>
        <App />
      </ReactQueryCacheProvider>
    </StrictMode>
  );
}
