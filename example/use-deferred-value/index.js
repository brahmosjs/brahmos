import Brahmos, { useDeferredValue, useState, useEffect } from 'brahmos';
import MySlowList from './MySlowList';
import ReactCredit from '../common/ReactCredit';

/**
 * Forked from:
 * https://codesandbox.io/s/infallible-dewdney-9fkv9
 */

function Toggle({ concurrentMode, setConcurrentMode }) {
  return (
    <div className="control-wrap">
      <strong>Concurrent Mode: &nbsp;</strong>
      <label className="radio">
        <input type="radio" checked={concurrentMode} onClick={() => setConcurrentMode(true)} />
        &nbsp;On
      </label>
      <label className="radio">
        <input type="radio" checked={!concurrentMode} onClick={() => setConcurrentMode(false)} />
        &nbsp;Off
      </label>
    </div>
  );
}

export default function App() {
  const [text, setText] = useState('');
  const [concurrentMode, setConcurrentMode] = useState(true);

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
      <p>Toggle concurrentMode and see the effect in input</p>
      <Toggle concurrentMode={concurrentMode} setConcurrentMode={setConcurrentMode} />
      <br />
      <label className="control-wrap">
        <span>Type into the input: </span>
        <input className="input small-width" value={text} onChange={handleChange} />
      </label>
      <p>
        Here we create 5 list item for each character in text box. Plus each of the list item
        completely blocks the main thread for 1.5 milliseconds.
        <br />
        <br />
        On concurrent mode we can see the app is able to stay responsive even the number of list
        increases and only delays displaying the list. While in normal mode the input starts getting
        janky as soon as the size of list grows.
      </p>
      <hr />
      {/* Pass the "lagging" value to the list */}
      <MySlowList text={concurrentMode ? deferredText : text} />
      <ReactCredit
        name="useDeferredValue hook"
        link="https://codesandbox.io/s/infallible-dewdney-9fkv9"
      />
    </div>
  );
}
