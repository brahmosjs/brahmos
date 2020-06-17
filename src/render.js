import { createElement } from './circularDep';

import { createFiber, createHostFiber } from './fiber';
import { doSyncProcessing } from './workLoop';
import { afterCurrentStack } from './utils';

function BrahmosRootComponent({ children }) {
  return children;
}

/**
 * Method to render a node
 */
export default function render(node, target) {
  const rootNode = createElement(BrahmosRootComponent, {}, node);

  const part = {
    parentNode: target,
    isNode: true,
  };

  let { __rootFiber: rootFiber } = target;

  let fiber;

  if (!rootFiber) {
    rootFiber = createHostFiber(target);

    fiber = createFiber(rootFiber, rootNode, part);

    // make the rootFiber parent of fiber
    fiber.parent = rootFiber;

    // make the root fiber the wip fiber of rootFiber
    rootFiber.current = fiber;

    // add root fiber on target
    target.__rootFiber = rootFiber;

    /**
     * do not schedule in first render
     * NOTE: This will also affect sync setStates inside componentDidMount, or useEffects.
     * This is expected to prevent multiple repaints
     */
    rootFiber.preventSchedule = true;
  } else {
    /**
     * TODO: Check this part of logic looks incorrect
     * if we are calling render method again, start again,
     * no need to clone the root fiber as it will always be different
     */
    fiber = rootFiber.current;
    fiber.processedTime = 0;
    fiber.node = rootNode;
  }

  doSyncProcessing(rootFiber.current);

  afterCurrentStack(() => {
    // reset preventSchedule after render
    rootFiber.preventSchedule = false;
  });
}
