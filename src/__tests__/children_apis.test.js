import { cloneElement, Children } from '../';
import { render } from './testUtils';

describe('Test cloneElement', () => {
  const Test = (props) => props.children;
  const element = <Test type="welcome">Hello World!</Test>;

  it('should not change any thing if props are not provided', () => {
    const elementClone = cloneElement(element);

    expect(elementClone).not.toStrictEqual(element);

    expect(elementClone.props).toEqual({
      type: 'welcome',
      children: 'Hello World!',
    });
  });

  it('should update props when replacement prop is provided', () => {
    // update props partially
    expect(cloneElement(element, { type: 'greet' }).props).toEqual({
      type: 'greet',
      children: 'Hello World!',
    });

    // update props along with children
    expect(cloneElement(element, { type: 'greet', children: 'Hello Brahmos!' }).props).toEqual({
      type: 'greet',
      children: 'Hello Brahmos!',
    });
  });

  it('should update children when replacement children is provided', () => {
    expect(cloneElement(element, { type: 'greet' }, 'Hello Brahmos!').props).toEqual({
      type: 'greet',
      children: 'Hello Brahmos!',
    });

    // passing undefined should replace child
    expect(cloneElement(element, { type: 'greet' }, undefined).props).toEqual({
      type: 'greet',
      children: undefined,
    });

    // should allow passing multiple children
    expect(cloneElement(element, { type: 'greet' }, 'Hello', 'Brahmos!').props).toEqual({
      type: 'greet',
      children: ['Hello', 'Brahmos!'],
    });
  });
});

describe('Test Children [forEach, map, count]', () => {
  const Child = ({ children }) => <span className="child">{children}</span>;

  it('should loop correctly on the flattened children', () => {
    const Parent = ({ children }) => {
      const count = Children.count(children);
      let forEachCount = 0;

      Children.forEach(children, () => {
        forEachCount += 1;
      });

      const modifiedChildren = Children.map(children, (child) => {
        return cloneElement(child, { children: 2 });
      });

      return (
        <div>
          <div className="child-wrap">{modifiedChildren}</div>
          <div className="count">{count}</div>
          <div className="foreach-count">{forEachCount}</div>
        </div>
      );
    };

    const { container } = render(
      <Parent>
        <Child>1</Child>
        <>
          <Child>1</Child>
          <Child>1</Child>
        </>
        {[1, 1].map((value) => (
          <Child>{value}</Child>
        ))}
      </Parent>,
    );

    expect(container.querySelector('.count').textContent).toEqual('5');
    expect(container.querySelector('.foreach-count').textContent).toEqual('5');
    expect(container.querySelector('.child-wrap').textContent).toEqual('22222');
  });
});
