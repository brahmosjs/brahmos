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

  it('should work for multiple memoized instance ', async () => {
    const Test = memo(({ onRender, testId }) => {
      onRender();
      return <div className="wrap">Hello World</div>;
    });

    let renderCount1 = 0;
    let renderCount2 = 0;

    const onRender1 = () => (renderCount1 += 1);
    const onRender2 = () => (renderCount2 += 1);

    const { update: update1 } = render(<Test onRender={onRender1} testId={0} />);
    const { update: update2 } = render(<Test onRender={onRender2} testId={0} />);

    expect(renderCount1).toEqual(1);
    expect(renderCount2).toEqual(1);

    // try re rendering with same props,  render count should not change
    update1({ onRender: onRender1, testId: 0 });
    expect(renderCount1).toEqual(1);

    // try re rendering with other props, render count should change
    update2({ onRender: onRender2, testId: 1 });
    expect(renderCount2).toEqual(2);
  });
});
