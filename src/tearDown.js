import {
  isRenderableNode,
  isBrahmosComponent,
  deleteNodesBetween,
  callLifeCycle,
} from './utils';

import { setRef } from './refs';

import { cleanEffects } from './hooks';

function handleUnmount (node) {
  if (!isRenderableNode(node)) return;

  const { componentInstance, ref } = node;
  /**
   * if node is classComponent We may have to call componentWillUnmount lifecycle method
   * In case of functional component we have to clean all the effects for that component
   */
  if (node.__$isBrahmosClassComponent$__) {
    callLifeCycle(componentInstance, 'componentWillUnmount');

    // set the ref as null of a class component
    setRef(ref, null);
  } else if (node.__$isBrahmosFunctionalComponent$__) {
    cleanEffects(componentInstance, true);
  }

  /**
   * loop over child nodes and tear it down as well
   */

  if (Array.isArray(node)) {
    for (let i = 0, ln = node.length; i < ln; i++) {
      tearDown(node[i]);
    }
  } else if (node.__$isBrahmosTag$__) {
    const { values, templateNode: { parts } } = node;
    for (let i = 0, ln = parts.length; i < ln; i++) {
      const part = part[i];
      const value = values[i];

      // if part is node than tear down the node value
      if (part.isNode) {
        tearDown(value);
      }

      // if part is attribute type look for ref attribute and set the ref as null
      if (part.isAttribute) {
        Object.entries(value).forEach(([attrName, attrValue]) => {
          if (attrName === 'ref') {
            setRef(attrValue, null);
          }
        });
      }
    }
    // call the ref methods of attribute parts
  } else if (node.__$isBrahmosComponent$__) {
    tearDown(componentInstance.__nodes);
  }
}

export default function tearDown (node, part) {
  // bail out if node is reused. It might be on different index
  if (!isRenderableNode(node) || node.isReused) return;

  part = isBrahmosComponent(node) ? node.componentInstance.__part : part;
  // call componentWillUnmount Lifecycle
  handleUnmount(node);

  // if part is defined it means we need to delete all nodes on a given part
  if (part) {
    const { parentNode, previousSibling, nextSibling } = part;
    deleteNodesBetween(parentNode, previousSibling, nextSibling);
  }
}
