
import Brahmos, { render } from '..';

describe('HooksTests', () => {
  let useState;
  let container;
  beforeEach(() => {
    container = document.createElement('div');
    useState = Brahmos.useState;
  });

  function test (element, expectedTag, text) {
    const instance = render(element, container);
    setTimeout(() => {
      expect(container.firstChild).not.toBeNull();
      expect(container.firstChild.tagName).toBe(expectedTag);
      expect(container.firstChild.textContent).toBe(text);
    }, 10);
    return instance;
  }

  describe('useState', () => {
    it('performs basic render', () => {
      function Counter (props) {
        const [count] = useState(0);
        return <span>Count: {count}</span>;
      }
      test(<Counter/>, 'SPAN', 'Count: 0');
    });

    it('renders lazy state initialization', () => {
      function Counter (props) {
        const [count] = useState(() => {
          return 0;
        });
        return <span>Count: {count}</span>;
      }
      test(<Counter/>, 'SPAN', 'Count: 0');
    });

    it('re-renders when state is changed', () => {
      function Counter (props) {
        const [count, setCount] = useState(0);
        setCount(1);
        return <span>Count: {count}</span>;
      }
      test(<Counter/>, 'SPAN', 'Count: 1');
    });

    it('renders multiple times when an updater is called', () => {
      function Counter () {
        const [count, setCount] = useState(0);
        if (count < 12) {
          setCount(c => c + 1);
          setCount(c => c + 1);
          setCount(c => c + 1);
        }
        return <span>Count: {count}</span>;
      }
      test(<Counter/>, 'SPAN', 'Count: 12');
    });
    it('does not trigger a re-renders when updater is invoked outside current render function', async () => {
      function UpdateCount ({ setCount, count, children }) {
        if (count < 3) {
          setCount(c => c + 1);
        }
        return <span>{children}</span>;
      }
      function Counter () {
        const [count, setCount] = useState(0);
        return (
          <div>
            <UpdateCount setCount={setCount} count={count}>
                Count: {count}
            </UpdateCount>
          </div>
        );
      }
      test(<Counter/>, 'SPAN', 'Count: 0');
    });
    it('keeps rendering until there are no more new updates', () => {
      function Counter () {
        const [count, setCount] = useState(0);
        if (count < 3) {
          setCount(count + 1);
        }
        return <span>Count: {count}</span>;
      }
      test(<Counter/>, 'SPAN', 'Count: 3');
    });
  });
});
