export function forwardRef(Component) {
  function forwardRefComponent({ ref, ...props }) {
    return Component(props, ref);
  }

  forwardRefComponent.__isForwardRef = true;

  return forwardRefComponent;
}

export function createRef() {
  return { current: null };
}

/** function to attach ref to the passed ref prop */
export function setRef(ref, instance) {
  /**
   * Note: we only support ref as callback and createRef syntax.
   * Brahmos does not support string ref as they are deprecated
   */
  const refType = typeof ref;
  if (refType === 'function') {
    ref(instance);
  } else if (refType === 'object') {
    ref.current = instance;
  }
}
