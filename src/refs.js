// @flow
import { getNormalizedProps } from './utils';
import type { ObjectLiteral, Ref, ObjectRef, FunctionalComponent } from './flow.types';
import { REACT_FORWARD_REF } from './configs';

export function forwardRef(Component: FunctionalComponent): FunctionalComponent {
  function ForwardRefComponent(props: ObjectLiteral) {
    return Component(getNormalizedProps(props, false), props.ref);
  }

  ForwardRefComponent.__isForwardRef = true;
  ForwardRefComponent.$$typeof = REACT_FORWARD_REF;

  return ForwardRefComponent;
}

export function createRef(): ObjectRef {
  return { current: null };
}

/** function to attach ref to the passed ref prop */
export function setRef(ref: Ref, instance: any): void {
  /**
   * Note: we only support ref as callback and createRef syntax.
   * Brahmos does not support string ref as they are deprecated
   */
  if (typeof ref === 'function') {
    ref(instance);
  } else if (typeof ref === 'object') {
    ref.current = instance;
  }
}
