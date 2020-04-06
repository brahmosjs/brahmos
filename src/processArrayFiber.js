import { getNextChildFiber, createAndLink } from './fiber';
import { getKey } from './utils';

// handle array nodes
export default function processArrayFiber(fiber) {
  const { node: nodes, part, root } = fiber;
  let refFiber = fiber;

  const { parentNode, previousSibling, nextSibling } = part;

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
      // reset the sibling of current fiber as sibling has to be decided by loop on node
      currentFiber.sibling = null;

      // delete the currentFiber from map, so we can use map to remove pending elements
      childKeyMap.delete(key);
    }

    // create fiber if required and link it
    refFiber = createAndLink(
      node,
      {
        parentNode,
        previousSibling,
        nextSibling,
        isArrayNode: true,
        nodeIndex: i,
      },
      currentFiber,
      refFiber,
      fiber,
    );
  }

  // mark non used node to tear down
  childKeyMap.forEach((fiber) => {
    root.tearDownFibers.push(fiber);
  });
}
