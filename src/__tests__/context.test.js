import { fireEvent } from '@testing-library/dom';

import { createContext, useState } from '..';
import { useContext } from '../brahmos';

import { render, sleep, unmountAll } from './testUtils';

describe('Test context API', () => {
  const TestContext = createContext();
  const { Provider, Consumer } = TestContext;

  beforeEach(unmountAll);

  it('should rerender Consumers if Provider passes new data and Consumer is not the direct child', async () => {
    const Parent = ({ children }) => {
      const [count, setCounter] = useState(1);
      return (
        <Provider
          value={{
            count,
            setCounter,
          }}
        >
          {children}
        </Provider>
      );
    };

    const Button = () => {
      // Try the useContext hook
      const { count, setCounter } = useContext(TestContext);
      return <button onClick={() => setCounter(count + 1)}>Increment</button>;
    };

    const Value = () => {
      // Try the hoc based consumer
      return (
        <Consumer>
          {(countContext) => {
            return <span className="value">{countContext.count}</span>;
          }}
        </Consumer>
      );
    };

    const Wrap = ({ children }) => {
      return <div>{children}</div>;
    };

    const { container } = render(
      <Parent>
        <Wrap>
          <Value />
        </Wrap>
        <Button />
      </Parent>,
    );

    fireEvent.click(container.querySelector('button'));

    await sleep(0);

    expect(container.querySelector('.value').textContent).toEqual('2');
  });
});
