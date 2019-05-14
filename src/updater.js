import TemplateNode from './TemplateNode';
import { getEventName, isEventAttribute, isNonZeroFalsy } from './utils';
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
    parent.removeChild(node);
    node = node.nextSibling;
  }
}

function addNodesBetween (parent, start, end, value) {
  const node = changeToNode(value);
  if (!start && !end) {
    parent.appendChild(node);
  } else if (!start) {
    parent.insertBefore(node, end);
  } else {
    parent.insertBefore(node, start.nextSibling);
  }
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
  /**
   * In case of old node is not a text node, or not present
   * delete old node and add new node
   */
  if (!oldNode || typeof oldNode !== 'string') {
    if (oldNode) {
      // delete the existing elements
      deleteNodesBetween(parentNode, previousSibling, nextSibling);
    }

    // add nodes at the right location
    addNodesBetween(parentNode, previousSibling, nextSibling, node);
  } else {
    console.log(node);
    // just update the content of the textNode
    const textNode = getCurrentNode(parentNode, previousSibling, nextSibling);
    textNode.textContent = node;
  }
}

function updateNode (part, node, oldNode) {
  if (isNonZeroFalsy(node)) {
    /**
     * If the new node is falsy value and
     * the oldNode is present we have to delete the old node
     * */
    if (oldNode) {
      const { parentNode, previousSibling, nextSibling } = part;

      // delete the existing elements
      deleteNodesBetween(parentNode, previousSibling, nextSibling);
    }
  } else if (Array.isArray(node)) {
    /**
     *
     * TODO: Handle array of nodes
     * */

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

    updater([part], [renderNodes]);
  } else if (node.__$isReactLitTag$__) {
    let { templateNode, values, oldValues } = node;
    const { parentNode, previousSibling, nextSibling } = part;
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

    if (freshRender) {
      // delete the existing elements
      deleteNodesBetween(parentNode, previousSibling, nextSibling);

      // add nodes at the right location
      addNodesBetween(parentNode, previousSibling, nextSibling, templateNode.node);
    }

    updater(templateNode.parts, values, oldValues);
  } else if (typeof node === 'string' && node !== oldNode) {
    updateTextNode(part, node, oldNode);
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
    !isAttrOverridden(tagAttrs, attrName, attrIndex)
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
