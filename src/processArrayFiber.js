import { getNextChildFiber, createAndLink, markToTearDown } from './fiber';
import { getKey } from './brahmosNode';

// handle array nodes
export default function processArrayFiber(fiber) {
  const { node: nodes, part } = fiber;
  let refFiber = fiber;

  const { parentNode, previousSibling } = part;

  const childKeyMap = new Map();

  let i = 0;
  let childFiber = fiber;
  /**
   * check if getNextChildFiber(childFiber, fiber) return a child if yes then add it to map
   */
  while ((childFiber = getNextChildFiber(childFiber, fiber))) {
    const key = getKey(childFiber.node, i);
    childKeyMap.set(key, childFiber);
    i++;
  }

  //
  /**
   * reset the previous children as we will link new children on fiber
   * This will make sure if there are no new child the old child is removed
   */
  fiber.child = null;

  for (let i = 0, ln = nodes.length; i < ln; i++) {
    const node = nodes[i];
    const key = getKey(node, i);
    const currentFiber = childKeyMap.get(key);

    if (currentFiber) {
      // delete the currentFiber from map, so we can use map to remove pending elements
      childKeyMap.delete(key);
    }

    // create fiber if required and link it
    refFiber = createAndLink(
      node,
      {
        parentNode,
        previousSibling,
        /**
         * Surprisingly an undefined dummy property increases V8 performance.
         * We remove nextSibling which when being undefined was running faster
         * Looks like inlining and deopt issue. But still have to figure out why
         * undefined property changed anything
         * Inlining this whole body inside processFiber was not giving issue without
         * undefined property
         */
        a: undefined,
        isArrayNode: true,
        nodeIndex: i,
      },
      currentFiber,
      refFiber,
      fiber,
    );

    // reset the sibling fiber on the ref fiber. This will be set on next iteration of loop.
    refFiber.sibling = null;
  }

  // mark non used node to tear down
  childKeyMap.forEach((fiber) => {
    markToTearDown(fiber);
  });
}
