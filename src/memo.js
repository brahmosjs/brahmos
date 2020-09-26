import shallowEqual from './helpers/shallowEqual';

export default function memo(Component, comparator) {
  let cachedComponent = null;
  let prevProps = null;
  comparator = comparator || shallowEqual;

  return function MemoizedComponent(props) {
    // Compare with latest props
    const isEqual = prevProps && comparator(prevProps, props);

    // Return Caches version
    if (isEqual) return cachedComponent;

    // Cache the latest copy, and return
    prevProps = props;
    cachedComponent = Component(props);
    return cachedComponent;
  };
}
