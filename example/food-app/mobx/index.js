import { StrictMode } from 'brahmos';

import App from './App';
import { RootStore, RootStoreProvider } from './mobx';

import '../food-app.css';

export default function ReduxExample() {
  return (
    <StrictMode>
      <p>
        This demo demonstrates Brahmos compatibility with Mobx.
        <br />
        The example is forked from{' '}
        <a
          href="https://github.com/itaditya/redux-hooks-for-food-delivery/tree/aditya-redux-to-mobx"
          target="_blank"
        >
          https://github.com/itaditya/redux-hooks-for-food-delivery/tree/aditya-redux-to-mobx
        </a>
      </p>
      <RootStoreProvider value={new RootStore()}>
        <App />
      </RootStoreProvider>
    </StrictMode>
  );
}
