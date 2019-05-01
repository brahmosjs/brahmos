import booleanAttributes from './boolean_attibutes';
import explicitProperty from './explicit_property';

export function isEventAttribute (attrName) {
  // must start with on prefix
  // used indexOf for cross browser support
  return attrName.indexOf('on') === 0;
}

export function getEventName (attrName) {
  return attrName.replace('on', '').toLowerCase();
}

export function isBooleanAttribute (attrName) {
  // used indexOf for cross browser support
  return booleanAttributes.indexOf(attrName) !== -1;
}

export function isPropertyAttribute (attrName) {
  return explicitProperty.indexOf(attrName) !== -1;
}

export function applyAttributes (attrs) {
  Object.entries(attrs).forEach(([attrName, attrValue]) => {
    let litAttrName;

    if (isEventAttribute(attrName)) {
      litAttrName = `@${getEventName(attrName)}`;
    } else if (isBooleanAttribute(attrName)) {
      litAttrName = `?${attrName}`;
    } else if (isPropertyAttribute(attrName)) {
      litAttrName = `.${attrName}`;
    } else {
      litAttrName = attrName;
    }
  });
}
