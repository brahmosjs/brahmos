import Brahmos, { render } from '..';
import { forwardRef, createRef, setRef } from '../refs';

describe('Test all ref utils work', () => {
  it('should forward ref to a Component', () => {
    class Component extends Brahmos.Component {
      render () {
        return null;
      }
    }

    const ForwardedComponent = forwardRef((props, ref) => (
      <Component ref={ref} />
    ));

    const componentInstance = render(
      <ForwardedComponent ref={111} />,
      document.createElement('div')
    );

    expect(componentInstance.__nodes.ref).toBe(111);
  });

  it('should return a ref when createRef is called', () => {
    const receivedRef = createRef();
    expect(receivedRef).toEqual({
      current: null,
    });
  });

  it('should set instance as current when setRef called with object type ref', () => {
    const ref = createRef();
    const instance = 'instance';
    setRef(ref, instance);
    expect(ref.current).toBe('instance');
  });

  it('should pass instance as param when setRef called with function type ref', () => {
    const mockRef = jest.fn();
    const instance = 'instance';
    setRef(mockRef, instance);
    expect(mockRef.mock.calls.length).toBe(1);
    expect(mockRef.mock.calls[0][0]).toBe('instance');
  });
});
