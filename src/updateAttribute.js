import {
  getEventName,
  isEventAttribute,
  RESERVED_ATTRIBUTES,
} from './utils';

import { setRef } from './refs';

import {
  getEffectiveEventName,
  getInputStateType,
  handleInputProperty,
  getPatchedEventHandler,
  eventHandlerCache,
} from './reactEvents';

function isAttrOverridden (tagAttrs, attrName, attrIndex) {
  const lastIndex = tagAttrs.lastIndexOf(attrName);
  return lastIndex !== -1 && lastIndex !== attrIndex;
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
        const oldPatchedHandler = eventHandlerCache.get(oldAttrValue) || oldAttrValue;
        node.removeEventListener(eventName, oldPatchedHandler);
      }

      node.addEventListener(eventName, patchedEventHandler);
    } else if (inputStateType) {
      handleInputProperty(inputStateType, node, attrName, attrValue);
    } else {
      // if attribute is value property
      node[attrName] = attrValue;

      //Remove property from new Attribute
      if ( typeof oldAttrValue != "undefined" ) {
           var old_keys = Object.keys( oldAttrValue );
           let old_iterval = old_keys.length;
           while( old_iterval-- ) {
                let old_property = old_keys[old_iterval];
                node.style[ old_property ] = undefined;
           }
      }

      if(attrName === 'style' && typeof attrValue === 'object'){

      //set property to new attribute
      var keys = Object.keys( attrValue );
      let iterval = keys.length;
      while( iterval-- ) {
           let property = keys[iterval];
           let value = attrValue[ keys[iterval] ];
           node.style[ property ] = value;

         }
      }
    }
  } else {
    node.setAttribute(attrName.toLowerCase(), attrValue);
  }
}

export default function updateAttribute (part, attrName, attrValue, oldAttrValue) {
  const { node, tagAttrs, attrIndex } = part;
  if (
    attrValue !== oldAttrValue &&
      !isAttrOverridden(tagAttrs, attrName, attrIndex) &&
      !RESERVED_ATTRIBUTES[attrName]
  ) {
    setAttribute(node, attrName, attrValue, oldAttrValue);
  } else if (attrName === 'ref') {
    // Note only functional refs are supported
    setRef(attrValue, node);
  }
}
