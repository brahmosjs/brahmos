import { callLifeCycle, remove } from './utils';

import { isComponentNode, isRenderableNode, isTagNode, CLASS_COMPONENT_NODE } from './brahmosNode';

import { setRef } from './refs';

import { cleanEffects } from './hooks';
import { BRAHMOS_DATA_KEY } from './configs';

function tearDownFiber(fiber) {
  const { node, nodeInstance } = fiber;

  // bail out shouldTearDown is false or if node is non-renderable node
  if (!isRenderableNode(node)) return;

  // recurse to the children and tear them down first
  let { child } = fiber;

  if (child) {
    tearDownFiber(child);
    while (child.sibling) {
      child = child.sibling;
      tearDownFiber(child);
    }
  }

  const { ref } = node;
  /**
   * We have to only handle tag, component and attributes,
   * as tag has elements to remove, attribute fiber can have ref to unset
   * and component can have ref and lifecycle method to call.
   *
   * Text nodes will be remove by removing its parent tag node. So no
   * need to handle text node separately
   */

  /**
   * This will cover ATTRIBUTE_NODE as well, so no need to handle them separately
   */
  if (ref) {
    setRef(ref, null);
  }

  // if there is no nodeInstance it means its not rendered yet so no need do anything on that
  // NOTE: This has to be after ref logic as attribute nodes do not have nodeInstance but setRef has to be done
  if (!nodeInstance) return;

  // if it is a tag node remove the dom elements added by tag node
  if (isTagNode(node)) {
    const { domNodes } = nodeInstance;

    // remove all the elements of nodeInstance
    remove(domNodes);
  }
  // if its a component node and is mounted then call lifecycle methods
  else if (isComponentNode(node) && nodeInstance[BRAHMOS_DATA_KEY].mounted) {
    // for class component call componentWillUnmount and for functional comp clean effects
    if (node.nodeType === CLASS_COMPONENT_NODE) {
      callLifeCycle(nodeInstance, 'componentWillUnmount');
    } else {
      cleanEffects(fiber, true);
    }
  }

  // reset the nodeInstance property in fiber
  fiber.nodeInstance = null;
}

export default function(root) {
  const { tearDownFibers } = root;

  tearDownFibers.forEach((fiber) => {
    // only tear down those fibers which are marked for tear down
    if (fiber.shouldTearDown) tearDownFiber(fiber);
  });

  // rest the tear down fibers
  root.tearDownFibers = [];
}
