// @flow
import { getNextChildFiber, createAndLink, markToTearDown, markPendingEffect } from './fiber';
import { getKey } from './brahmosNode';
import { EFFECT_TYPE_PLACEMENT, EFFECT_TYPE_OTHER } from './configs';

import type { Fiber } from './flow.types';

// handle array nodes
export default function processArrayFiber(fiber: Fiber): void {
  const { node: nodes, part } = fiber;
  let refFiber = fiber;

  // $FlowFixMe: part will always be node part on array fiber
  const { parentNode, previousSibling, firstDOMNode } = part;

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

  nodes.forEach((node, index) => {
    const key = getKey(node, index);
    const currentFiber = childKeyMap.get(key);

    if (currentFiber) {
      // delete the currentFiber from map, so we can use map to remove pending elements
      childKeyMap.delete(key);
    }

    const previousFiber = refFiber;

    // create fiber if required and link it
    refFiber = createAndLink(
      node,
      // $FlowFixMe: property a is added for some weird chrome de-optimizaion issue
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
        firstDOMNode,
        isArrayNode: true,
        nodeIndex: index,
        parentArrayPart: part.isArrayNode ? part : null,
      },
      currentFiber,
      previousFiber,
      fiber,
    );

    // reset the sibling fiber on the ref fiber. This will be set on next iteration of loop.
    refFiber.sibling = null;

    /**
     * if current fiber nodeIndex is different than new index,or if it is a new fiber without any alternate
     * mark fiber and its previous fiber to have uncommitted placement effect
     */
    // $FlowFixMe: we only have to check for array part here
    if (currentFiber && currentFiber.part.nodeIndex !== index) {
      markPendingEffect(refFiber, EFFECT_TYPE_PLACEMENT);

      // mark the previous fiber as well having the placement effect, as it makes it easier to
      // rearrange the dom nodes
      if (index !== 0) markPendingEffect(previousFiber, EFFECT_TYPE_PLACEMENT);
    }
  });

  // mark non used node to tear down
  childKeyMap.forEach((fiber) => {
    markToTearDown(fiber);
  });

  // mark the array fiber for handling effects
  markPendingEffect(fiber, EFFECT_TYPE_OTHER);
}
