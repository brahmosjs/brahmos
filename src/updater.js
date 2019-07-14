import updateAttribute from './updateAttribute';
import updateNode from './updateNode';

import { applyHandlers } from './mountHandlerQueue';

export default function updater (parts, values, oldValues = [], context, forceUpdate, root) {
  for (let i = 0, ln = parts.length; i < ln; i++) {
    const part = parts[i];
    const value = values[i];
    const oldValue = oldValues[i];

    const { isAttribute, isNode } = part;
    if (isAttribute) {
      Object.entries(value).forEach(([attrName, attrValue]) => {
        const oldAttrValue = oldValue && oldValue[attrName];
        updateAttribute(part, attrName, attrValue, oldAttrValue);
      });
    } else if (isNode) {
      updateNode(part, value, oldValue, context, forceUpdate);
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
