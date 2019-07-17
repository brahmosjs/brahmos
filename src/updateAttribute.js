import {
  getEventName,
  isEventAttribute,
} from './utils';

import {
  getEffectiveEventName,
  getInputStateType,
  handleInputProperty,
  getPatchedEventHandler,
  eventHandlerCache,
} from './reactEvents';

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

      // remove old event and assign it again
      if (oldAttrValue) {
        const oldPatchedHandler = eventHandlerCache.get(oldAttrValue) || oldAttrValue;
        node.removeEventListener(eventName, oldPatchedHandler);
      }

      // if new event is defined assign new event handler
      if (attrValue) {
        const patchedEventHandler = getPatchedEventHandler(node, attrValue);
        node.addEventListener(eventName, patchedEventHandler);
      }
    } else if (inputStateType) {
      handleInputProperty(inputStateType, node, attrName, attrValue);
    } else {
      // if attribute is value property
      node[attrName] = attrValue;
    }
  } else {
    attrName = attrName.toLowerCase();
    /**
     * if attribute value is defined set the new attribute value and if
     * it is not defined and oldAttribute is present remove the oldAttribute;
     */
    if (attrValue !== undefined) {
      node.setAttribute(attrName, attrValue);
    } else if (oldAttrValue !== undefined) {
      node.removeAttribute(attrName);
    }
  }
}

export default function updateNodeAttributes (node, attributes, oldAttributes) {
  // add new attributes
  Object.entries(attributes).forEach(([attrName, attrValue]) => {
    const oldAttrValue = oldAttributes && oldAttributes[attrName];
    if (
      attrValue !== oldAttrValue
    ) {
      setAttribute(node, attrName, attrValue, oldAttrValue);
    }
  });

  // remove old attributes
  Object.entries(oldAttributes).forEach(([attrName, attrValue]) => {
    if (attributes[attrName] === undefined) {
      setAttribute(node, attrName, null, attrValue);
    }
  });
}
