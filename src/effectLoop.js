// @flow
import {
  isTagElementNode,
  isTagNode,
  isComponentNode,
  isPrimitiveNode,
  ATTRIBUTE_NODE,
  CLASS_COMPONENT_NODE,
} from './brahmosNode';
import { callLifeCycle, insertBefore, getNextSibling } from './utils';
import { getTransitionFromFiber } from './transitionUtils';
import { getPendingUpdatesKey } from './updateUtils';
import { runEffects, cleanEffects } from './hooks';

import updateNodeAttributes from './updateAttribute';
import {
  EFFECT_TYPE_NONE,
  BRAHMOS_DATA_KEY,
  UPDATE_TYPE_DEFERRED,
  LAST_ARRAY_DOM_KEY,
  EFFECT_TYPE_OTHER,
  UPDATE_TYPE_SYNC,
} from './configs';
import { getUpdateTimeKey, getLastCompleteTimeKey } from './fiber';
import { setRef } from './refs';

import type {
  HostFiber,
  Fiber,
  Part,
  NodePart,
  ArrayPart,
  TemplateNodeType,
  ExtendedElement,
} from './flow.types';

/**
 * Updater to handle text node
 */
function updateTextNode(fiber: Fiber): void {
  const { node, alternate } = fiber;

  // $FlowFixMe: We come to this method only as node part/array part so we don't need to handle Attribute part
  const part: ArrayPart | NodePart = fiber.part;

  const { parentNode, previousSibling } = part;
  /**
   * Get the next sibling before which we need to append the text node.
   */
  const nextSibling = getNextSibling(parentNode, previousSibling);

  /**
   * The nextSibling will point to text node if the tag fiber is already rendered
   * In which case we just have to update the node value of the nextSibling
   */
  if (alternate && nextSibling) {
    // if we have text node just update the text node
    nextSibling.nodeValue = node;
  } else {
    // add nodes at the right location
    insertBefore(parentNode, nextSibling, node);
  }
}

function getTagChild(fiber: Fiber): Fiber {
  while (fiber.child && fiber.node && !isTagNode(fiber.node)) fiber = fiber.child;

  return fiber;
}

function setLastItemInParentDOM(parentNode: ExtendedElement, nodeInstance: TemplateNodeType): void {
  const { domNodes } = nodeInstance;
  parentNode[LAST_ARRAY_DOM_KEY] = domNodes[domNodes.length - 1];
}

/**
 * For array item we need to store first element reference in the part of parent fiber.
 * This is required to calculate correct prev sibling of first dom node in the list .
 */
function setFirstNodeReference(part: Part, firstDOMNode: Node) {
  if (part.isArrayNode && part.nodeIndex === 0) {
    // $FlowFixMe: the while loop here checks if part is not undefined
    while ((part = part.parentArrayPart)) {
      part.firstDOMNode = firstDOMNode;
    }
  }
}

function getCorrectPreviousSibling(part: NodePart | ArrayPart): ?Node {
  let { previousSibling } = part;

  /**
   * When the part is a array part we might not have correct previous sibling
   * In such case we have different ways to find the previous sibling
   */
  if (part.isArrayNode) {
    const { firstDOMNode, nodeIndex } = part;
    /**
     * if the the nodeIndex is > 0 then we can always rely on the LAST_ARRAY_DOM_KEY,
     * As during mount and update we maintain this information.
     */
    if (nodeIndex > 0) {
      previousSibling = part.parentNode[LAST_ARRAY_DOM_KEY];
    } else if (part.parentArrayPart) {
      /**
       * If the part has parentArrayPart. It means there is array inside array.
       * With that there can be two cases.
       *
       * 1. On mount phase where the elements are not inserted yet, we will not have first node info.
       * In which case we want to rely on LAST_ARRAY_DOM_KEY on parent element.
       *
       * 2. On update we will always have firstDOMNode reference, in this case we find the previousSibling
       * using firstDOMNode, so we always get the correct prevSibling of the array part.
       */
      previousSibling = firstDOMNode
        ? firstDOMNode.previousSibling
        : part.parentNode[LAST_ARRAY_DOM_KEY];
    }
  }

  return previousSibling;
}

function reArrangeExistingNode(fiber: Fiber, alternate: Fiber): void {
  // $FlowFixMe: We only handle ArrayPart in this function so can ignore other types
  const { part }: { part: ArrayPart } = fiber;

  if (!part.isArrayNode) return;

  const { nodeIndex, parentNode } = part;

  // $FlowFixMe: We only handle ArrayPart in this function so can ignore other types
  const oldNodeIndex = alternate.part.nodeIndex;

  const tagChild = getTagChild(fiber);
  const { nodeInstance } = tagChild;

  // if there is no nodeInstance or if tagChild has pendingEffects bail out from rearrange in component level
  const componentChildHasEffect = tagChild !== fiber && tagChild.hasUncommittedEffect;
  if (!nodeInstance || componentChildHasEffect) return;

  // if the item position on last render and current render is not same, then do a rearrange
  if (nodeIndex !== oldNodeIndex) {
    const { domNodes } = nodeInstance;

    const previousSibling = getCorrectPreviousSibling(part);
    const nextSibling = getNextSibling(parentNode, previousSibling);

    // if there is dom node and it isn't in correct place rearrange the nodes
    const firstDOMNode = domNodes[0];
    if (
      firstDOMNode &&
      firstDOMNode.previousSibling !== previousSibling &&
      firstDOMNode !== nextSibling
    ) {
      insertBefore(parentNode, nextSibling, domNodes);
    }

    setFirstNodeReference(part, firstDOMNode);
  }

  // set the last item of domNodes in parentNode
  setLastItemInParentDOM(parentNode, nodeInstance);
}

function handleTagEffect(fiber: Fiber) {
  const { nodeInstance, alternate, node } = fiber;

  // $FlowFixMe: TagNode will always be inside Array part of node part
  const part: ArrayPart | NodePart = fiber.part;
  const { parentNode } = part;

  const _isTagElement = isTagElementNode(node);

  // if it is the tag element handle the attributes from same fiber
  if (_isTagElement) {
    handleAttributeEffect(fiber, nodeInstance.domNodes[0]);
  }

  // if the alternate node is there rearrange the element if required, or else just add the new node
  if (alternate) {
    reArrangeExistingNode(fiber, alternate);
  } else {
    const previousSibling = getCorrectPreviousSibling(part);
    const nextSibling = getNextSibling(parentNode, previousSibling);

    const domNodes: Array<Node> = insertBefore(parentNode, nextSibling, nodeInstance.fragment);

    /**
     * when we add nodes first time
     * and we are rendering as fragment it means the fragment might have childNodes
     * which nodeInstance does not have, so for such cases we should reset nodeList on nodeInstance;
     */
    if (!_isTagElement) {
      nodeInstance.domNodes = domNodes;
    }

    setFirstNodeReference(part, domNodes[0]);

    // set the last item of domNodes in parentNode
    setLastItemInParentDOM(parentNode, nodeInstance);
  }
}

function handleComponentEffect(fiber) {
  const { node, nodeInstance, root } = fiber;
  const { updateType } = root;
  const { nodeType } = node;
  const brahmosData = nodeInstance[BRAHMOS_DATA_KEY];

  const isDeferredUpdate = updateType === UPDATE_TYPE_DEFERRED;

  if (nodeType === CLASS_COMPONENT_NODE) {
    // if it is deferredUpdate set the memoizedValues into nodeInstance state and prop
    if (isDeferredUpdate) {
      Object.assign(nodeInstance, brahmosData.memoizedValues);
    }

    const { props: prevProps, state: prevState } = brahmosData.committedValues;

    brahmosData.lastSnapshot = callLifeCycle(nodeInstance, 'getSnapshotBeforeUpdate', [
      prevProps,
      prevState,
    ]);
  } else {
    // clean the existing effect
    cleanEffects(fiber, false);
  }

  // remove all the pending updates associated with current transition
  const { transitionId } = getTransitionFromFiber(fiber, null);
  const pendingUpdatesKey = getPendingUpdatesKey(updateType);
  brahmosData[pendingUpdatesKey] = isDeferredUpdate
    ? brahmosData[pendingUpdatesKey].filter((stateMeta) => stateMeta.transitionId !== transitionId)
    : [];

  // reset isDirty flag
  brahmosData.isDirty = false;
  brahmosData.renderCount = 0;

  root.postCommitEffects.push(fiber);
}

function handleComponentPostCommitEffect(fiber) {
  const { node, nodeInstance, root, childFiberError } = fiber;
  const { updateType } = root;

  const { nodeType, ref } = node;
  const brahmosData = nodeInstance[BRAHMOS_DATA_KEY];

  if (nodeType === CLASS_COMPONENT_NODE) {
    const { props, state } = nodeInstance;
    const { committedValues, lastSnapshot } = brahmosData;
    // get the previous state and prevProps
    const { props: prevProps, state: prevState } = committedValues;
    /**
     * if it is first time rendered call componentDidMount or else call componentDidUpdate
     * prevProps will not be available for first time render
     */
    if (!prevProps) {
      callLifeCycle(nodeInstance, 'componentDidMount');
    } else {
      callLifeCycle(nodeInstance, 'componentDidUpdate', [prevProps, prevState, lastSnapshot]);
    }

    if (childFiberError) {
      callLifeCycle(nodeInstance, 'componentDidCatch', [
        childFiberError.error,
        childFiberError.errorInfo,
      ]);

      // reset the error
      fiber.childFiberError = null;
    }

    // if the component node has ref call the ref with the node instance
    if (ref) setRef(ref, nodeInstance);

    // after commit is done set the current prop and state on committed values
    committedValues.props = props;
    committedValues.state = state;

    brahmosData.memoizedValues = null;
  } else {
    // call effects of functional component
    runEffects(fiber);

    // switch deferred hooks array and syncHooks hooks array, if it is deferred state update
    if (updateType === UPDATE_TYPE_DEFERRED) {
      const { syncHooks, deferredHooks } = nodeInstance;
      nodeInstance.deferredHooks = syncHooks;
      nodeInstance.syncHooks = deferredHooks;
    }
  }

  // mark component as mounted
  brahmosData.mounted = true;

  // add fiber reference on component instance, so the component is aware of its fiber
  brahmosData.fiber = fiber;
}

function handleAttributeEffect(fiber, domNode) {
  const { node, alternate, isSvgPart } = fiber;
  const { props, ref } = node;
  const oldProps = alternate && alternate.node.props;

  updateNodeAttributes(domNode, props, oldProps, isSvgPart);

  // set ref if present
  if (ref) setRef(ref, domNode);
}

export function resetEffectProperties(root: HostFiber) {
  root.tearDownFibers = [];
  root.postCommitEffects = [];
  root.hasUncommittedEffect = false;

  /**
   * reset retryFiber. A retryFiber might not get reset if
   * the sync render happened while the fiber processing is
   * scheduled
   */
  root.retryFiber = null;

  // reset after render callbacks
  root.resetRenderCallbacks();
}

/**
 * reset properties which are not required in future
 * of alternate fiber so those property values can be garbage collected
 */
function resetAlternate(alternate) {
  alternate.node = null;
  alternate.nodeInstance = null;
  alternate.child = null;
  alternate.sibling = null;
}

export function removeTransitionFromRoot(root: HostFiber): void {
  const { currentTransition, pendingTransitions } = root;
  const currentTransitionIndex = pendingTransitions.indexOf(currentTransition);
  if (currentTransitionIndex !== -1) {
    pendingTransitions.splice(currentTransitionIndex, 1);
  }
}

function handleFiberEffect(fiber) {
  const { node, alternate } = fiber;
  const _isComponentNode = node && isComponentNode(node);

  // if the fiber is part of an array and requires rearrange then do it
  if (_isComponentNode && alternate) {
    reArrangeExistingNode(fiber, alternate);
  }

  // if node has uncommitted effect, handle the effect
  if (fiber.hasUncommittedEffect === EFFECT_TYPE_OTHER) {
    if (isPrimitiveNode(node)) {
      updateTextNode(fiber);
    } else if (isTagNode(node)) {
      handleTagEffect(fiber);
      // TODO: Handle rearrange type of effect
    } else if (_isComponentNode) {
      handleComponentEffect(fiber);
    } else if (node.nodeType === ATTRIBUTE_NODE) {
      handleAttributeEffect(fiber, fiber.part.domNode);
    }

    // reset the hasUncommittedEffect flag
    fiber.hasUncommittedEffect = EFFECT_TYPE_NONE;
  }

  /**
   * once the fiber is committed, we can remove child and sibling link from alternate,
   * so unused child and sibling fiber (if not linked as alternate of any current node)
   * can be garbage collected
   */
  if (alternate) {
    resetAlternate(alternate);
  }
}

/**
 * Fix pointers on fibers, and return the fibers with effects
 */
export function preCommitBookkeeping(root: HostFiber): Array<Fiber> {
  const { updateType, wip, current } = root;
  const updateTimeKey = getUpdateTimeKey(updateType);
  const lastCompleteTime = root[getLastCompleteTimeKey(updateType)];
  const fibersWithEffect = [];

  let fiber = updateType === UPDATE_TYPE_SYNC ? current : wip;

  while (fiber) {
    const { createdAt, node, child, hasUncommittedEffect } = fiber;
    const updateTime = fiber[updateTimeKey];
    const fiberIsNew = createdAt > lastCompleteTime;
    const hierarchyHasUpdates = hasUncommittedEffect || updateTime > lastCompleteTime;

    if (hasUncommittedEffect) {
      // push fiber in new fiber list
      fibersWithEffect.push(fiber);
    }

    // correct the references
    if (fiberIsNew) {
      /**
       * if child is there and it does not point back to correct parent
       * set the pointer back to parent. This can happen if the fiber is new
       * but the child is an existing fiber. This can happen when we haven't
       * processed fiber and just cloned from the current tree
       * We don't do this during rendering phase to not disturb the current tree
       */
      if (child && child.parent !== fiber) child.parent = fiber;

      /**
       * If fiber is new and it is a component node we will need update the fiber
       * reference in the component node
       */
      if (node && isComponentNode(node)) {
        fiber.nodeInstance[BRAHMOS_DATA_KEY].fiber = fiber;
      }
    }

    /**
     * do a depth first traversal,
     * go to child fiber only if the fiber is new, if its not
     * it means no child has updates
     */
    if (child && hierarchyHasUpdates) fiber = child;
    else {
      while (fiber !== root && !fiber.sibling) fiber = fiber.parent;
      fiber = fiber.sibling;
    }
  }

  return fibersWithEffect;
}

export default function effectLoop(root: HostFiber, fibersWithEffect: Array<Fiber>): void {
  // loop on new fibers hand call if effect needs to be called
  for (let i = 0, ln = fibersWithEffect.length; i < ln; i++) {
    handleFiberEffect(fibersWithEffect[i]);
  }

  const { postCommitEffects } = root;

  // after applying the effects run all the post effects
  for (let i = postCommitEffects.length - 1; i >= 0; i--) {
    handleComponentPostCommitEffect(postCommitEffects[i]);
  }

  // remove the current transition from pending transition
  removeTransitionFromRoot(root);

  // once all effect has been processed update root's last effect node and postCommitEffects
  resetEffectProperties(root);

  // clear the force update node from root only after the effect
  root.forcedUpdateWith = null;
}
