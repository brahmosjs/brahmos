import { StrictMode } from 'brahmos';
import { Provider } from 'react-redux';

import App from './App';
import { createReduxStore } from './redux';

import '../food-app.css';

export default function ReduxExample() {
  return (
    <StrictMode>
      <p>
        This demo demonstrates Brahmos compatibility with Redux.
        <br />
        The example is forked from{' '}
        <a href="https://github.com/itaditya/redux-hooks-for-food-delivery/" target="_blank">
          https://github.com/itaditya/redux-hooks-for-food-delivery/
        </a>
      </p>
      <Provider store={createReduxStore()}>
        <App />
      </Provider>
    </StrictMode>
  );
}
