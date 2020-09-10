// @flow
import { callLifeCycle, remove, getNextSibling, isMounted } from './utils';

import {
  isComponentNode,
  isRenderableNode,
  isTagNode,
  CLASS_COMPONENT_NODE,
  isPrimitiveNode,
} from './brahmosNode';

import { setRef } from './refs';

import { cleanEffects } from './hooks';

import type { HostFiber } from './flow.types';

function tearDownChild(child, part, _isTagNode, removeDOM) {
  /**
   * if we got a tag to remove for child nodes we don't need to remove those
   * nodes in child fibers as it will be remove by current fiber
   * Note, some child node can be outside of the dom boundary a TagNode is covering
   * So we should check if the parent node of the child is not same as the tagNode.
   */
  let _removeDOM = child.part.parentNode !== part.parentNode && _isTagNode ? false : removeDOM;

  // if a child is portal then we should keep the remove dom to true
  const { node } = child;
  if (node && node.portalContainer) {
    _removeDOM = true;
  }

  tearDownFiber(child, _removeDOM);
}

function tearDownFiber(fiber, removeDOM) {
  const { node, part, nodeInstance } = fiber;

  /**
   * mark the fiber shouldTearDown to false to avoid extra teardown in case
   * same fiber is pushed twice, this can happen when we looped in between the
   * render cycle
   */
  fiber.shouldTearDown = false;

  // bail out shouldTearDown is false or if node is non-renderable node
  if (!isRenderableNode(node)) return;

  // recurse to the children and tear them down first
  const _isTagNode = isTagNode(node);
  let { child } = fiber;

  if (child) {
    tearDownChild(child, part, _isTagNode, removeDOM);

    while (child.sibling) {
      child = child.sibling;
      tearDownChild(child, part, _isTagNode, removeDOM);
    }
  }

  // if it is primitive node we need to delete the text node associated with it
  if (isPrimitiveNode(node) && removeDOM) {
    const textNode = getNextSibling(part.parentNode, part.previousSibling);
    if (textNode) remove(textNode);
    return;
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
  if (_isTagNode) {
    const { domNodes } = nodeInstance;

    // remove all the elements of nodeInstance
    if (removeDOM) remove(domNodes);
  }
  // if its a component node and is mounted then call lifecycle methods
  else if (isComponentNode(node) && isMounted(nodeInstance)) {
    // for class component call componentWillUnmount and for functional comp clean effects
    if (node.nodeType === CLASS_COMPONENT_NODE) {
      callLifeCycle(nodeInstance, 'componentWillUnmount');
    } else {
      cleanEffects(fiber, true);
    }
  }
}

export default function(root: HostFiber): void {
  const { tearDownFibers } = root;

  tearDownFibers.forEach((fiber) => {
    // only tear down those fibers which are marked for tear down
    if (fiber.shouldTearDown) tearDownFiber(fiber, true);
  });

  // rest the tear down fibers
  root.tearDownFibers = [];
}
