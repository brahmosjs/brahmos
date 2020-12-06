import { getEffectiveAttrName, getEventName, isEventAttribute, loopEntries } from './utils';

import {
  getEffectiveEventName,
  getInputStateType,
  handleInputProperty,
  getPatchedEventHandler,
  handleControlledReset,
} from './reactEvents';

import { XLINK_NS, IS_NON_DIMENSIONAL } from './configs';

/**
 * Lot of diffing and applying attribute logic in this file is inspired/forked from Preact
 * Reference:
 * https://github.com/preactjs/preact/blob/master/src/diff/props.js
 */

function applyDiffProperty(newObj, oldObj, resetValue, cb) {
  oldObj = oldObj || {};
  // add new attributes
  loopEntries(newObj, (key, value) => {
    const oldValue = oldObj[key];
    if (value !== oldValue) {
      cb(key, value, oldValue);
    }
  });

  // remove old attributes
  loopEntries(oldObj, (key, value) => {
    if (newObj[key] === undefined && value !== undefined) {
      cb(key, resetValue, value);
    }
  });
}

function setAttribute(node, attrName, attrValue, oldAttrValue, isSvgAttribute) {
  /**
   * children attrName is not a valid attribute, if the attrName is coming as children
   * ignore it. This happens when we are the brahmos nodeType is tag element node.
   * We don't remove children from props to avoid extra object creation.
   */
  if (attrName === 'children') return;

  const isEventAttr = isEventAttribute(attrName);

  // Handle event attributes
  if (isEventAttr) {
    // Reference https://github.com/facebook/react/blob/master/packages/react-dom/src/events/DOMPluginEventSystem.js#L498
    const isCaptureEvent =
      attrName.substr(-7) === 'Capture' && attrName.substr(-14, 7) === 'Pointer';
    let eventName = getEventName(attrName, isCaptureEvent);
    eventName = getEffectiveEventName(eventName, node);

    // get patched event handler
    const patchedHandler = getPatchedEventHandler(node, attrName, attrValue);

    // if new event handler is not there but it had old handler, remove the old one
    if (oldAttrValue && !attrValue) {
      node.removeEventListener(eventName, patchedHandler, isCaptureEvent);
      // if the event is getting added first time add a listener
    } else if (!oldAttrValue && attrValue) {
      node.addEventListener(eventName, patchedHandler, isCaptureEvent);
    }

    // handle style attributes
  } else if (attrName === 'style') {
    const { style } = node;
    applyDiffProperty(attrValue || {}, oldAttrValue, '', (key, value) => {
      /**
       * check if it is custom property (--some-custom-property),then use setProperty to assign value
       * otherwise just add the property in style object
       */
      if (key[0] === '-') {
        style.setProperty(key, value);
      } else {
        style[key] =
          typeof value === 'number' && IS_NON_DIMENSIONAL.test(key) === false
            ? value + 'px'
            : value;
      }
    });

    // handle dangerously set innerHTML
  } else if (attrName === 'dangerouslySetInnerHTML') {
    const oldHTML = oldAttrValue && oldAttrValue.__html;
    const newHTML = attrValue && attrValue.__html;
    if (newHTML !== oldHTML) {
      node.innerHTML = newHTML == null ? '' : newHTML; // `==` here will check for undefined and null
    }
    // handle node properties
  } else if (attrName in node && !isSvgAttribute) {
    const inputStateType = getInputStateType(node);
    /**
     * if it is input element it has to be handled differently,
     * otherwise just set the property value
     */
    if (inputStateType) {
      handleInputProperty(inputStateType, node, attrName, attrValue);
    } else {
      node[attrName] = attrValue == null ? '' : attrValue; // `==` here will check for undefined and null
    }

    // handle all other node attributes
  } else {
    // if attribute name is modified for JSX props, reset the name
    attrName = getEffectiveAttrName(attrName);

    /**
     * If attribute is prefixed with xlink then we have to set attribute with namespace
     * if attribute value is defined set the new attribute value and if
     * it is not defined and oldAttribute is present remove the oldAttribute;
     */
    let attrNameWithoutNS = attrName.replace(/^xlink:?/, '');

    // if attribute value is null, undefined or false remove the attribute
    const removeAttribute = attrValue == null || attrValue === false;

    if (attrName !== attrNameWithoutNS) {
      attrNameWithoutNS = attrNameWithoutNS.toLowerCase();
      if (removeAttribute) {
        node.removeAttributeNS(XLINK_NS, attrNameWithoutNS);
      } else {
        node.setAttributeNS(XLINK_NS, attrNameWithoutNS, attrValue);
      }
    } else if (removeAttribute) {
      node.removeAttribute(attrName);
    } else {
      node.setAttribute(attrName, attrValue);
    }
  }
}

export default function updateNodeAttributes(node, attributes, oldAttributes, isSvgAttribute) {
  applyDiffProperty(attributes, oldAttributes, null, (attrName, attrValue, oldAttrValue) => {
    setAttribute(node, attrName, attrValue, oldAttrValue, isSvgAttribute);
  });

  // handle controlled input resetting
  handleControlledReset(node);
}
