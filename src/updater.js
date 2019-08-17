import updateNodeAttributes from './updateAttribute';
import { RESERVED_ATTRIBUTES, MODIFIED_ATTRIBUTES } from './configs';
import updateNode from './updateNode';
import { setRef } from './refs';

import { applyHandlers } from './mountAndEffectQueue';

export function isAttrOverridden (tagAttrs, attrName, attrIndex) {
  const lastIndex = tagAttrs.lastIndexOf(attrName);
  // if attrIndex is before the last attribute with same name it means its overridden
  return attrIndex <= lastIndex;
}

export default function updater (parts, values, oldValues, context, forceUpdate, isSvgPart, root) {
  for (let i = 0, ln = parts.length; i < ln; i++) {
    let part = parts[i];
    const value = values[i];
    const oldValue = oldValues[i];

    const { isAttribute, isNode } = part;
    if (isAttribute) {
      const { node } = part;

      // mix all the consecutive attributes if they belong to same node
      const dynamicAttributes = {};
      while (part && node === part.node) {
        Object.entries(values[i]).forEach(([attrName, attrValue]) => {
          const overrideAttrNameCheck = MODIFIED_ATTRIBUTES[attrName];
          const isOverridden = isAttrOverridden(part.tagAttrs, overrideAttrNameCheck, part.attrIndex);
          if (!isOverridden && !RESERVED_ATTRIBUTES[attrName]) {
            dynamicAttributes[attrName] = attrValue;
          } else if (attrName === 'ref') {
            // Note only functional refs are supported
            setRef(attrValue, node);
          }
        });
        part = parts[++i];
      }

      // reduce the counter to correct the loop index. As it is extra incremented in while loop
      i--;

      const oldDynamicAttributes = node.__dynamicAttributes || {};

      // store the dynamic attribute reference on node so it can be used on next render
      node.__dynamicAttributes = dynamicAttributes;

      updateNodeAttributes(node, dynamicAttributes, oldDynamicAttributes, isSvgPart);
    } else if (isNode) {
      updateNode(part, value, oldValue, context, forceUpdate, isSvgPart);
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
