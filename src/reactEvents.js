import { getNodeName } from './utils';
import { syncUpdates } from './updateUtils';
import { RENAMED_EVENTS, ONCHANGE_INPUT_TYPES } from './configs';

export function getEffectiveEventName(eventName, node) {
  const { type } = node;
  const nodeName = getNodeName(node);

  if (RENAMED_EVENTS[eventName]) return RENAMED_EVENTS[eventName];

  /**
   * Logic Source:  (https://github.com/preactjs/preact/blob/master/src/constants.js)
   */
  return /^change(textarea|input)/i.test(eventName + nodeName) && !ONCHANGE_INPUT_TYPES.test(type) ? 'input': eventName;
}

export function getInputStateType(node) {
  const { type } = node;
  const nodeName = getNodeName(node);
  if (nodeName === 'input' && (type === 'radio' || type === 'checkbox')) {
    return 'checked';
  } else if (nodeName === 'input' || nodeName === 'select' || nodeName === 'textarea') {
    return 'value';
  }
}

export function handleControlledReset(node) {
  const inputStateType = getInputStateType(node);

  // if it is not an controlled input type return
  if (!inputStateType) return;

  const propValue = node[`${inputStateType}Prop`];
  const value = node[inputStateType];

  if (propValue !== undefined && propValue !== value) {
    node[inputStateType] = propValue;
  }
}

export function handleInputProperty(inputStateType, node, attrName, attrValue) {
  /**
   * if we are passing checked prop / value prop, set the value and also store the prop value
   * to the node so we can check if the element is controlled or not, and in controlled element
   * reset the property to the property passed as stored prop
   *
   * For other properties just set it
   * */
  if (inputStateType === 'checked') {
    if (attrName === 'checked') {
      node.checked = attrValue;
      node.checkedProp = attrValue;
    } else if (attrName === 'defaultChecked' && node.checkedProp === undefined) {
      node.checked = attrValue;
    } else {
      node[attrName] = attrValue;
    }
  } else if (inputStateType === 'value') {
    if (attrName === 'value') {
      node.value = attrValue;
      node.valueProp = attrValue;
    } else if (attrName === 'defaultValue' && node.valueProp === undefined) {
      node.value = attrValue;
    } else {
      node[attrName] = attrValue;
    }
  }
}

export function getPatchedEventHandler(node, attrName, handler) {
  const eventHandlers = node.__brahmosData.events;
  let eventHandlerObj = eventHandlers[attrName];

  /**
   * if eventHandlerObj is already defined update it with new handler
   * or else create a new object
   */
  //
  if (eventHandlerObj) {
    eventHandlerObj.handler = handler;
    return eventHandlerObj.patched;
  } else {
    eventHandlerObj = eventHandlers[attrName] = {
      handler,
      patched: null,
    };
  }

  eventHandlerObj.patched = function(event) {
    // if the handler is defined call the handler
    if (eventHandlerObj.handler) {
      syncUpdates(() => {
        eventHandlerObj.handler.call(this, event);
      });
    }
  };

  return eventHandlerObj.patched;
}
