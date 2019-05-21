import updateAttribute from './updateAttribute';
import updateNode from './updateNode';

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
