import TemplateNode from './TemplateNode';
import {
  getEventName,
  isEventAttribute,
  isNonZeroFalsy,
  isReactLitNode,
  isPrimitiveNode,
  toArray,
  lastItem,
  removeNodes,
  RESERVED_ATTRIBUTES,
} from './utils';

import {
  getEffectiveEventName,
  getInputStateType,
  handleInputProperty,
  getPatchedEventHandler,
} from './reactEvents';
import functionalComponentInstance from './functionalComponentInstance';

function changeToNode (value) {
  if (value instanceof Node) {
    return value;
  } else if (Array.isArray(value) || value instanceof NodeList) {
    const fragment = document.createDocumentFragment();
    for (let i = 0, ln = value.length; i < ln; i++) {
      fragment.appendChild(value[i]);
    }
    return fragment;
  }

  return document.createTextNode(value.toString());
}

function deleteNodesBetween (parent, start, end) {
  if (!start && !end) {
    parent.innerHTML = '';
    return;
  }

  let node;

  if (!start) {
    node = parent.firstChild;
  } else {
    node = start.nextSibling;
  }

  while (node && node !== end) {
    const { nextSibling } = node;
    parent.removeChild(node);
    node = nextSibling;
  }
}

function addNodesBetween (parent, start, end, value) {
  const node = changeToNode(value);
  const persistentNode = node instanceof DocumentFragment
    ? toArray(node.childNodes)
    : node;

  if (!start && !end) {
    parent.appendChild(node);
  } else if (!start) {
    parent.insertBefore(node, end);
  } else {
    parent.insertBefore(node, start.nextSibling);
  }

  return persistentNode;
}

function getCurrentNode (parentNode, previousSibling, nextSibling) {
  if (previousSibling) {
    return previousSibling.nextSibling;
  } else if (nextSibling) {
    return nextSibling.previousSibling;
  } else {
    return parentNode.firstChild;
  }
}

function updateTextNode (part, node, oldNode) {
  const { parentNode, previousSibling, nextSibling } = part;
  // get the last text node
  let textNode = getCurrentNode(parentNode, previousSibling, nextSibling);

  /**
   * In case of old node is not a text node, or not present
   * delete old node and add new node
   */
  if (!isPrimitiveNode(oldNode)) {
    if (oldNode) {
      // delete the existing elements
      deleteNodesBetween(parentNode, previousSibling, nextSibling);
    }

    // add nodes at the right location
    textNode = addNodesBetween(parentNode, previousSibling, nextSibling, node);
  } else {
    // just update the content of the textNode
    const textNode = getCurrentNode(parentNode, previousSibling, nextSibling);
    textNode.textContent = node;
  }

  return textNode;
}

function updateArrayNodes (part, nodes, oldNodes = []) {
  const { parentNode, previousSibling, nextSibling } = part;

  const nodesLength = nodes.length;
  let lastChild = previousSibling;

  // remove all the unused old nodes
  for (let i = 0, ln = oldNodes.length; i < ln; i++) {
    const oldNode = oldNodes[i];
    if (isReactLitNode(oldNode) && !oldNode.isReused) {
      removeNodes(parentNode, oldNode.templateNode.nodes);
    }
  }

  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    const oldNode = oldNodes[i];
    /**
     * Pass forceUpdate as true, when newNodes and oldNodes keys are not same
     */

    const forceUpdate = !(node && oldNode && node.key === oldNode.key);

    lastChild = updateNode({
      parentNode,
      previousSibling: lastChild,
      nextSibling: lastChild.nextSibling,
    }, node, oldNode, forceUpdate);
  }

  // remove all extra nodes between lastChild and nextSibling
  deleteNodesBetween(parentNode, lastChild, nextSibling);

  return lastChild;
}

function updateNode (part, node, oldNode, forceRender) {
  const { parentNode, previousSibling, nextSibling } = part;

  if (isNonZeroFalsy(node)) {
    /**
     * If the new node is falsy value and
     * the oldNode is present we have to delete the old node
     * */
    if (oldNode) {
      // delete the existing elements
      deleteNodesBetween(parentNode, previousSibling, nextSibling);
    }
  } else if (Array.isArray(node)) {
    return updateArrayNodes(part, node, oldNode);
  } else if (node.__$isReactLitComponent$__) {
    const {
      type: Component,
      props,
      __$isReactLitFunctionalComponent$__: isFunctionalComponent,
    } = node;

    /** If Component instance is not present on node create a new instance */
    let { componentInstance } = node;

    if (!componentInstance) {
      // create an instance of the component
      componentInstance = isFunctionalComponent
        ? functionalComponentInstance(Component)
        : new Component(props);

      /**
         * store the part information on the component instance,
         * so every component have the information of where it has to render
         */
      componentInstance.__part = part;

      // keep the reference of instance to the node.
      node.componentInstance = componentInstance;
    }

    // render nodes
    const renderNodes = componentInstance.__render(props);

    return updateNode(part, renderNodes, null, forceRender);
  } else if (node.__$isReactLitTag$__) {
    let { templateNode, values, oldValues } = node;
    let freshRender;

    /**
     * if you don't get the old template node it means you have to render the node firts time
     * in such cases delete the nodes where the template node is supposed to be present.
     */
    if (!templateNode) {
      freshRender = true;
      templateNode = new TemplateNode(node.template);

      // add templateNode to node so we can access it on next updates
      node.templateNode = templateNode;
    }

    /**
     * update parts before attaching elements to dom,
     * so most of the work happens on fragment
     */

    updater(templateNode.parts, values, oldValues);

    if (freshRender) {
      // delete the existing elements
      deleteNodesBetween(parentNode, previousSibling, nextSibling);

      // add nodes first time
      addNodesBetween(parentNode, previousSibling, nextSibling, templateNode.fragment);
    }

    /**
     * Rearrange node if forceRender is set and the element is not on correct position
     */
    const firstChild = templateNode.nodes[0];
    const onCorrectPos = firstChild && firstChild.previousSibling === previousSibling;

    if (forceRender && !onCorrectPos) {
      // add nodes at the right position
      addNodesBetween(parentNode, previousSibling, nextSibling, templateNode.nodes);
    }

    return lastItem(templateNode.nodes);
  } else if (isPrimitiveNode(node) && node !== oldNode) {
    return updateTextNode(part, node, oldNode);
  }
}

function isAttrOverridden (tagAttrs, attrName, attrIndex) {
  const lastIndex = tagAttrs.lastIndexOf(attrName);
  return lastIndex !== -1 && lastIndex !== attrIndex;
}

function updateAttribute (part, attrName, attrValue, oldAttrValue) {
  const { node, tagAttrs, attrIndex } = part;
  if (
    attrValue !== oldAttrValue &&
    !isAttrOverridden(tagAttrs, attrName, attrIndex) &&
    !RESERVED_ATTRIBUTES[attrName]
  ) {
    setAttribute(node, attrName, attrValue, oldAttrValue);
  }
}

function setAttribute (node, attrName, attrValue, oldAttrValue) {
  /*
    if node has property with attribute name, set the value directly as property
    otherwise set it as attribute
  */

  const isEventAttr = isEventAttribute(attrName);
  if (attrName in node || isEventAttr) {
    const inputStateType = getInputStateType(node);
    /*
     if it is a property check if it is a event callback
     or other property and handle it accordingly
    */
    if (isEventAttr) {
      let eventName = getEventName(attrName);
      eventName = getEffectiveEventName(eventName, node);
      const patchedEventHandler = getPatchedEventHandler(node, attrValue);

      // remove old event and assign it again
      if (oldAttrValue) {
        node.removeEventListener(eventName, oldAttrValue);
      }

      node.addEventListener(eventName, patchedEventHandler);
    } else if (inputStateType) {
      handleInputProperty(inputStateType, node, attrName, attrValue);
    } else {
      // if attribute is value property
      node[attrName] = attrValue;
    }
  } else {
    node.setAttribute(attrName.toLowerCase(), attrValue);
  }
}

export default function updater (parts, values, oldValues = []) {
  for (let i = 0, ln = parts.length; i < ln; i++) {
    const part = parts[i];
    const value = values[i];
    const oldValue = oldValues[i];

    const { isAttribute, isNode } = part;
    if (isAttribute) {
      const keys = Object.keys(value);
      for (let j = 0, keysLn = keys.length; j < keysLn; j++) {
        const attrName = keys[j];
        const attrValue = value[attrName];
        const oldAttrValue = oldValue && oldValue[attrName];
        updateAttribute(part, attrName, attrValue, oldAttrValue);
      }
    } else if (isNode) {
      updateNode(part, value, oldValue);
    }
  }
}
