import Brahmos, { useState, useEffect, useRef } from 'brahmos';
import ReactCredit from '../common/ReactCredit';

function useInterval(callback, delay) {
  const savedCallback = useRef();

  // Remember the latest function.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

export default function Counter() {
  const [count, setCount] = useState(0);
  const [delay, setDelay] = useState(1000);
  const [isRunning, setIsRunning] = useState(true);

  useInterval(
    () => {
      // Your custom logic here
      setCount(count + 1);
    },
    isRunning ? delay : null,
  );

  function handleDelayChange(e) {
    setDelay(Number(e.target.value));
  }

  function handleIsRunningChange(e) {
    setIsRunning(e.target.checked);
  }

  return (
    <>
      <p>
        This demo demonstrates usage of hooks in Brahmos. The example here uses useState, useRef and
        useEffect hooks to make setInterval declarative.
      </p>
      <h1>{count}</h1>
      <input type="checkbox" checked={isRunning} onChange={handleIsRunningChange} /> Running
      <br />
      <input type="number" value={delay} onChange={handleDelayChange} />
      <ReactCredit
        name="declarative setInterval with hooks"
        link="https://overreacted.io/making-setinterval-declarative-with-react-hooks/"
      />
    </>
  );
}
