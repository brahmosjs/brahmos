import { getNodeName } from './utils';

const RENAMED_EVENTS = {
  'doubleclick': 'dblclick',
};

export const eventHandlerCache = new WeakMap();

export function getEffectiveEventName (eventName, node) {
  const nodeName = getNodeName(node);

  if (RENAMED_EVENTS[eventName]) return RENAMED_EVENTS[eventName];

  return nodeName === 'input' && eventName === 'change' ? 'input' : eventName;
}

export function getInputStateType (node) {
  const { type } = node;
  const nodeName = getNodeName(node);
  if (nodeName === 'input' && (type === 'radio' || type === 'checkbox')) {
    return 'checked';
  } else if (nodeName === 'input' || nodeName === 'select' || nodeName === 'textarea') {
    return 'value';
  }
}

export function handleInputProperty (inputStateType, node, attrName, attrValue) {
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

export function getPatchedEventHandler (node, handler) {
  let patchedHandler = eventHandlerCache.get(handler);
  if (patchedHandler) return patchedHandler;

  const inputStateType = getInputStateType(node);

  const scheduleCheckedReset = () => {
    const { checkedProp, checked } = node;
    if (checkedProp !== checked) {
      node.checked = checkedProp;
    }
  };

  const scheduleValueReset = () => {
    const { valueProp, value } = node;
    if (valueProp !== value) {
      node.value = valueProp;
    }
  };

  patchedHandler = function (event) {
    if (inputStateType === 'checked') {
      const { checkedProp } = node;

      if (checkedProp !== undefined) {
        requestAnimationFrame(scheduleCheckedReset);
      }
    } else if (inputStateType === 'value') {
      const { valueProp } = node;
      if (valueProp !== undefined) {
        requestAnimationFrame(scheduleValueReset);
      }
    }

    // if the handler is defined call the handler
    if (handler) {
      handler.call(this, event);
    }
  };

  eventHandlerCache.set(handler, patchedHandler);

  return patchedHandler;
}
