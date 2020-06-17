import tearDown from './tearDown';
import { brahmosDataKey } from './configs';

function unmountComponentAtNode(container) {
  /**
   * if container has a brahmosNode, it will be tear down.
   * TODO: Check this with new fiber architecture
   */
  const { brahmosNode } = container[brahmosDataKey];
  if (brahmosNode) {
    tearDown(brahmosNode, { parentNode: container });
    return true;
  }
  return false;
}

export default unmountComponentAtNode;
