import updateAttribute from './updateAttribute';
import updateNode from './updateNode';

import { applyHandlers } from './mountHandlerQueue';

export default function updater (parts, values, oldValues = [], context, root) {
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
      updateNode(part, value, oldValue, context);
    }
  }

  /**
   * if the node is the root of the mount
   * call the mount/update handlers once dom nodes are attached
   */
  if (root) {
    applyHandlers();
  }
}
