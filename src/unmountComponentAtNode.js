// @flow
import tearDown from './tearDown';
import { markToTearDown } from './fiber';

import type { ExtendedElement } from './flow.types';

function unmountComponentAtNode(container: ExtendedElement): boolean {
  /**
   * Most of the time we only to unmount component from the root elem
   * TODO: Should we support unmounting from any element rendered by react itself. Check if React allows that
   */
  const { __rootFiber: root } = container;
  if (root) {
    // tear down the current tree
    markToTearDown(root.current);
    tearDown(root);

    // remove the __rootFiber reference
    container.__rootFiber = undefined;

    return true;
  }

  return false;
}

export default unmountComponentAtNode;
