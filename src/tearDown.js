import { callLifeCycle, loopEntries, remove } from './utils';

import { isComponentNode, isRenderableNode, isTagNode, CLASS_COMPONENT_NODE } from './brahmosNode';

import { removeHandler } from './mountAndEffectQueue';

import { setRef } from './refs';

import { cleanEffects } from './hooks';
import { BRAHMOS_DATA_KEY } from './configs';

function handleUnmount(node) {
  const { componentInstance, ref, mountHandler } = node;
  /**
   * If node is mounted and
   * if node is classComponent We may have to call componentWillUnmount lifecycle method
   * In case of functional component we have to clean all the effects for that component
   */
  if (componentInstance && componentInstance[BRAHMOS_DATA_KEY].mounted) {
    if (node.nodeType === CLASS_COMPONENT_NODE) {
      callLifeCycle(componentInstance, 'componentWillUnmount');

      // set the ref as null of a class component
      setRef(ref, null);

      // and for functional component remove effects
    } else {
      cleanEffects(componentInstance, true);
    }
  } else if (mountHandler) {
    /**
     * If node is not mounted remove the mount handlers from the mount queue
     */
    removeHandler(node.mountHandler);
  }

  /**
   * loop over child nodes and tear it down as well
   */

  if (Array.isArray(node)) {
    for (let i = 0, ln = node.length; i < ln; i++) {
      tearDownNode(node[i]);
    }
  } else if (isTagNode(node)) {
    const {
      values,
      templateNode: { parts, domNodes },
    } = node;
    for (let i = 0, ln = parts.length; i < ln; i++) {
      const part = parts[i];
      const value = values[i];

      // if part is node than tear down the node value
      if (part.isNode) {
        tearDownNode(value);
      }

      // if part is attribute type look for ref attribute and set the ref as null
      if (part.isAttribute) {
        loopEntries(value, (attrName, attrValue) => {
          if (attrName === 'ref') {
            setRef(attrValue, null);
          }
        });
      }
    }

    // remove all the elements of templateNode
    remove(domNodes);

    // remove the template node
    node.templateNode = null;

    // call the ref methods of attribute parts
  } else if (isComponentNode(node) && componentInstance) {
    const brahmosData = componentInstance[BRAHMOS_DATA_KEY];
    // if component is not mounted, we can skip the teardown
    if (!brahmosData.mounted) return;

    tearDownNode(brahmosData.nodes);
    // mark componentInstance as unmounted
    brahmosData.mounted = false;

    // remove the componentInstance from node;
    node.componentInstance = null;
  }
}

function tearDownNode(node, part) {
  // bail out if node is non-renderable node
  if (!isRenderableNode(node)) return;

  /**
   * in case of portal nodes the passed part information will be incorrect
   * as the node is ported to a different dom node.
   * In such case take create part information based on portalContainer
   */

  const { portalContainer } = node;

  if (portalContainer) {
    part = {
      parentNode: portalContainer,
      isNode: true,
    };
  }

  // call componentWillUnmount Lifecycle
  handleUnmount(node);

  // // if part is defined it means we need to delete all nodes on a given part
  // if (part) {
  //   const { parentNode, previousSibling, nextSibling } = part;
  //   deleteNodesBetween(parentNode, previousSibling, nextSibling);
  // }
}

export default function(root) {
  const { tearDownFibers } = root;

  for (let i = 0, ln = tearDownFibers.length; i < ln; i++) {
    const { node, part } = tearDownFibers[i];
    tearDownNode(node, part);
  }

  // rest the tear down fibers
  root.tearDownFibers = [];
}
