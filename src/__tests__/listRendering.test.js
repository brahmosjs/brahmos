import { fireEvent } from '@testing-library/dom';
import { html } from 'js-beautify';

import { useState } from '../brahmos';
import { render, unmountAll } from './testUtils';

describe('Test list rendering', () => {
  describe('Test non keyed and keyed list', () => {
    beforeEach(unmountAll);

    it('should render a list properly', () => {
      const items = [1, 2, 3, 4];
      function TestComp() {
        return (
          <ul>
            {items.map((item) => {
              return <li key={item}>{item}</li>;
            })}
          </ul>
        );
      }

      const { container } = render(<TestComp />);
      expect(container.innerHTML).toEqual('<ul><li>1</li><li>2</li><li>3</li><li>4</li></ul>');
    });

    it('should maintain the element based on key', () => {
      const items = [1, 2, 3, 4];
      const items2 = [3, 2, 1, 4];

      function TestComp({ items }) {
        return (
          <ul>
            {items.map((item) => {
              return (
                <li key={item} data-testid={item}>
                  {item}
                </li>
              );
            })}
          </ul>
        );
      }

      const { container, update } = render(<TestComp items={items} />);

      // Find the initial element to do reference check with next render
      const item1 = container.getByTestId('1');

      update({ items: items2 });

      expect(container.textContent).toEqual('3214');

      // after rerender it should hold the same element reference
      expect(container.getByTestId('1')).toEqual(item1);
    });

    it('should update the value without reordering element if key is not provided', () => {
      const items = [1, 2, 3, 4];
      const items2 = [3, 2, 1, 4];

      function TestComp({ items }) {
        return (
          <ul>
            {items.map((item) => {
              return <li data-testid={item}>{item}</li>;
            })}
          </ul>
        );
      }

      const { container, update } = render(<TestComp items={items} />);

      // Find the firest element to do reference check with next render
      const firstChild = container.querySelectorAll('li')[0];

      update({ items: items2 });

      // renders correctly
      expect(container.textContent).toEqual('3214');

      // after rerender it should hold the same element reference
      expect(container.querySelectorAll('li')[0]).toEqual(firstChild);
    });
  });

  describe('Test nested list', () => {
    const items = [1, 2, [3, 4], 5, 6];

    function List({ items }) {
      return items.map((item, index) => {
        if (Array.isArray(item)) return <List key={'a' + index} items={item} />;

        return (
          <li key={item} data-testid={item}>
            {item}
          </li>
        );
      });
    }

    function TestComp({ items }) {
      return (
        <ul>
          <List items={items} />
        </ul>
      );
    }

    let container, update;

    beforeAll(() => {
      ({ container, update } = render(<TestComp items={items} />));
    });

    afterEach(() => {
      update({ items });
    });

    it('should correctly render nested list', () => {
      expect(container.textContent).toEqual('123456');
      expect(container.querySelectorAll('li').length).toEqual(6);
    });

    it('should correctly handle update when a item is added on first level nesting', () => {
      update({ items: [1, 2, 7, [3, 4], 5, 6] });
      expect(container.textContent).toEqual('1273456');
    });

    it('should correctly handle update when a item is removed on first level nesting', () => {
      update({ items: [1, [3, 4], 5, 6] });
      expect(container.textContent).toEqual('13456');

      update({ items: [1, [3, 4], 6] });
      expect(container.textContent).toEqual('1346');
    });

    it('should correctly handle update when a item is added on second level nesting', () => {
      update({ items: [1, 2, [3, 4, 7], 5, 6] });
      expect(container.textContent).toEqual('1234756');
    });

    it('should correctly handle update when a item is removed on first level nesting', () => {
      update({ items: [1, 2, [3], 5, 6] });
      expect(container.textContent).toEqual('12356');
    });
  });

  describe('Test Stateful Components in Array', () => {
    const Item = ({ item }) => <li>{item}</li>;
    const Repeater = ({ id, increment, reverse }) => {
      const [count, setCount] = useState(2);
      const [reverseList, setReverseState] = useState(false);

      const items = [];
      if (reverse) {
        items.push(
          <li key={id + 'btn'}>
            <button
              data-testid={id + 'reverse'}
              onClick={() => {
                setReverseState(!reverseList);
              }}
            >
              Reverse List
            </button>
          </li>,
        );
      } else {
        items.push(
          <li key={id + 'btn'}>
            <button
              data-testid={id + 'count'}
              onClick={() => {
                setCount(increment ? count + 1 : count - 1);
              }}
            >
              {increment ? 'Increase' : 'Decrease'} Count
            </button>
          </li>,
        );
      }

      Array.from({ length: count }).forEach((val, index) => {
        items.push(<Item key={id + index} item={id + index} />);
      });

      if (reverseList) items.reverse();

      return items;
    };

    let container;

    beforeEach(() => {
      ({ container } = render(
        <div>
          {[
            <Item key="a" item={'a'} />,
            <Repeater key="b" id={'b'} increment />,
            <Repeater key="c" id={'c'} increment={false} />,
            <Repeater key="d" id={'d'} reverse />,
            <Item key="e" item={'e'} />,
          ]}
        </div>,
      ));
    });

    afterEach(unmountAll);

    it('should render nested elements in correct order', () => {
      expect(html(container.innerHTML)).toMatchSnapshot();
    });

    it('should handle adding item on state full component which is part of an array.', async () => {
      // should handle adding elements in between
      fireEvent.click(container.getByTestId('bcount'));

      // wait for current stack to empty.
      await 1;

      expect(container.getByText('b2')).not.toBeNull();
      expect(html(container.innerHTML)).toMatchSnapshot();
    });

    it('should handle removing item on state full component which is part of an array.', async () => {
      // should handle deleting elements in between
      fireEvent.click(container.getByTestId('ccount'));

      // wait for current stack to empty.
      await 1;
      //   expect(container.getByText('c1')).toBeNull();
      expect(html(container.innerHTML)).toMatchSnapshot();
    });

    it('should handle shuffle of items on state full component which is part of an array.', async () => {
      // should handle deleting elements in between
      fireEvent.click(container.getByTestId('dreverse'));

      // wait for current stack to empty.
      await 1;
      //   expect(container.getByText('c1')).toBeNull();
      expect(html(container.innerHTML)).toMatchSnapshot();
    });
  });
});
