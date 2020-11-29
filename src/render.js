// @flow
import { createBrahmosNode } from './circularDep';
import { CLASS_COMPONENT_NODE } from './brahmosNode';
import { BrahmosRootComponent } from './utils';
import { createFiber, createHostFiber, setUpdateTime } from './fiber';
import { doSyncProcessing } from './workLoop';
import { syncUpdates, getCurrentUpdateSource } from './updateUtils';

import { UPDATE_TYPE_SYNC } from './configs';

import type { ExtendedElement } from './flow.types';

/**
 * Method to render a node
 */
export default function render(node: any, target: ExtendedElement) {
  let { __rootFiber: rootFiber } = target;

  let fiber;

  if (!rootFiber) {
    const rootNode = createBrahmosNode(BrahmosRootComponent, { children: node });

    const part = {
      parentNode: target,
      previousSibling: null,
      isNode: true,
    };

    rootFiber = createHostFiber(target);

    fiber = createFiber(rootFiber, rootNode, part);

    // make the rootFiber parent of fiber
    // $FlowFixMe: rootFiber can only be parent in case of rootNode
    fiber.parent = rootFiber;

    // make the root fiber the wip fiber of rootFiber
    rootFiber.current = fiber;

    // add root fiber on target
    target.__rootFiber = rootFiber;
  } else {
    /**
     * Update the children in BrahmosRootComponent node and also reset the processedTime
     * so it can processed again.
     */
    fiber = rootFiber.current;
    fiber.node.props.children = node;
    fiber.processedTime = 0;
    setUpdateTime(fiber, UPDATE_TYPE_SYNC);
  }

  /**
   * do not schedule in render
   * NOTE: This will also affect sync setStates inside componentDidMount, or useEffects.
   * This is expected to prevent multiple repaints
   */
  syncUpdates(() => {
    rootFiber.updateSource = getCurrentUpdateSource();
    doSyncProcessing(fiber);
  });

  // if it is a class component return the component instance, or else return null
  // $FlowFixMe: As the fiber is a wrapper component, it will always have child
  return node && node.nodeType === CLASS_COMPONENT_NODE ? fiber.child.nodeInstance : null;
}
