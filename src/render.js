import { createElement } from './circularDep';
import { BrahmosRootComponent } from './utils';
import { createFiber, createHostFiber, setUpdateTime } from './fiber';
import { doSyncProcessing } from './workLoop';
import { syncUpdates, getCurrentUpdateSource } from './updateUtils';

/**
 * Method to render a node
 */
export default function render(node, target) {
  let { __rootFiber: rootFiber } = target;

  let fiber;

  if (!rootFiber) {
    const rootNode = createElement(BrahmosRootComponent, {}, node);

    const part = {
      parentNode: target,
      isNode: true,
    };

    rootFiber = createHostFiber(target);

    fiber = createFiber(rootFiber, rootNode, part);

    // make the rootFiber parent of fiber
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
    setUpdateTime(fiber);
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
}
