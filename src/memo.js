import { PureComponent } from './Component';
import { createBrahmosNode } from './circularDep';

export default function memo(Component, comparator) {
  class MemoizedComponent extends PureComponent {
    render() {
      return createBrahmosNode(Component, this.props);
    }
  }

  MemoizedComponent.displayName = `Memo(${Component.displayName || Component.name})`;

  return MemoizedComponent;
}
