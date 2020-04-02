import * as Brahmos from './createElement';
import updater from './updater';
import {
  fibers,
  createFiber,
  createHostFiber,
  addAlternates,
  getNextFiber,
  cloneCurrentFiber,
} from './fiber';
import workLoop from './workLoop';

function startRender(current, wip) {
  wip = cloneCurrentFiber(current);
  workLoop(wip);
}

function BrahmosRootComponent({ children }) {
  return children;
}

/**
 * Method to render a node
 */
export default function render(node, target) {
  const rootNode = <BrahmosRootComponent>{node}</BrahmosRootComponent>;

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
    rootFiber.wip = fiber;

    // add root fiber on target
    target.__rootFiber = rootFiber;
  } else {
    /**
     * if we are calling render method again, start with WIP,
     * no need to clone the root fiber as it will always be different
     */
    fiber = rootFiber.wip;
    fiber.processed = false;
    fiber.node = rootNode;
  }

  workLoop(fiber);
}

/**
 * Method to rerender a given component
 * In case of reRender, start from the root,
 * clone the current fiber to wip, and use the wip which is pointing
 * to children of current tree.
 */
export function reRender(component, forceUpdate) {
  const { __fiber: fiber } = component;
  const { root } = fiber;

  root.wip = cloneCurrentFiber(root.current, root.wip, root, root);

  workLoop(root.wip);
}
