import shallowEqual from './helpers/shallowEqual';

export default function memo(Component, comperator) {
  let cachedComponent = null;
  let prevProps = null;
  comperator = comperator || shallowEqual;

  return function MemoizedComponent(props) {
    // Compare with latest props
    const isEqual = prevProps && comperator(prevProps, props);

    // Return Caches version
    if (isEqual) return cachedComponent;

    // Cache the latest copy, and return
    prevProps = props;
    cachedComponent = Component(props);
    return cachedComponent;
  };
}
