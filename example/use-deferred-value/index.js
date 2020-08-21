import Brahmos, { useDeferredValue, useState, useEffect } from '../../src';
import MySlowList from './MySlowList';
import ReactCredit from '../common/ReactCredit';

/**
 * Forked from:
 * https://codesandbox.io/s/infallible-dewdney-9fkv9
 */

export default function App() {
  const [text, setText] = useState('hello');

  // This is a new feature in Concurrent Mode.
  // This value is allowed to "lag behind" the text input:
  const deferredText = useDeferredValue(text, {
    timeoutMs: 5000,
  });

  function handleChange(e) {
    setText(e.target.value);
  }

  return (
    <div className="App">
      <h1>Brahmos With Concurrent Mode</h1>
      <ReactCredit
        name="useDeferredValue hook"
        link="https://codesandbox.io/s/infallible-dewdney-9fkv9"
      />
      <label>
        Type into the input: <input value={text} onChange={handleChange} />
      </label>
      <p>
        Even though each list item in this demo completely blocks the main thread for 3
        milliseconds, the app is able to stay responsive in Concurrent Mode.
      </p>
      <hr />
      {/* Pass the "lagging" value to the list */}
      <MySlowList text={deferredText} />
      <div id="observerElm">{deferredText === 'hell' ? <span>Something</span> : null}</div>
    </div>
  );
}
