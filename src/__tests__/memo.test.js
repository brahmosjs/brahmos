import { fireEvent } from '@testing-library/dom';

import { memo, useState } from '../';

import { render, sleep } from './testUtils';

describe('Test memoization', () => {
  it('should rerender on state change in memoized functional component ', async () => {
    const Test = memo(() => {
      const [value, setValue] = useState(1);
      return (
        <div className="wrap">
          <span className="value">{value}</span>
          <button onClick={() => setValue(value + 1)}>Increment</button>
        </div>
      );
    });

    const { container } = render(<Test />);

    fireEvent.click(container.querySelector('button'));

    await sleep(0);

    expect(container.querySelector('.value').textContent).toEqual('2');
  });
});
