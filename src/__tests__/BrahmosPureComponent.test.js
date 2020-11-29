/*
Forked from -
https://github.com/facebook/react/blob/master/packages/react/src/__tests__/ReactPureComponent-test.js
*/
import Brahmos, { render } from '..';

describe('BrahmosPureComponent', () => {
  it('should re-render only when old and new props or state are not shallow equal', (done) => {
    let renders = 0;
    class Component extends Brahmos.PureComponent {
      constructor() {
        super();
        this.state = { type: 'mushrooms' };
      }

      render() {
        renders++;
        return <div>{this.props.text[0]}</div>;
      }
    }

    const container = document.createElement('div');
    let text;
    let component;

    text = ['porcini'];
    component = render(<Component text={text} />, container);
    expect(container.textContent).toBe('porcini');
    expect(renders).toBe(1);

    text = ['morel'];
    component = render(<Component text={text} />, container);
    expect(container.textContent).toBe('morel');
    expect(renders).toBe(2);

    text[0] = 'portobello';
    component = render(<Component text={text} />, container);
    expect(container.textContent).toBe('morel');
    expect(renders).toBe(2);

    // Setting state without changing it doesn't cause a rerender.
    component.setState({ type: 'mushrooms' }, () => {
      expect(container.textContent).toBe('morel');
      expect(renders).toBe(2);
      // But changing state does.
      component.setState({ type: 'portobello mushrooms' }, () => {
        expect(container.textContent).toBe('portobello');
        expect(renders).toBe(3);
        done();
      });
    });
  });

  it('extends Brahmos.Component', () => {
    let renders = 0;
    class Component extends Brahmos.PureComponent {
      constructor() {
        super(); // Doesn't render if constructor is removed
      }

      render() {
        renders++;
        return <div />;
      }
    }
    const pureComponentInstance = render(<Component />, document.createElement('div'));
    expect(pureComponentInstance instanceof Brahmos.Component).toBe(true);
    expect(pureComponentInstance instanceof Brahmos.PureComponent).toBe(true);
    expect(renders).toBe(1);
  });
});
