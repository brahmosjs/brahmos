import { loopEntries } from './utils';
import { brahmosNode, isBrahmosNode } from './brahmosNode';
import updateNodeAttributes from './updateAttribute';
import { RESERVED_ATTRIBUTES, MODIFIED_ATTRIBUTES } from './configs';
import updateNode from './updateNode';
import { setRef } from './refs';

import { applyHandlers } from './mountAndEffectQueue';

export function isAttrOverridden(tagAttrs, attrName, attrIndex) {
  const lastIndex = tagAttrs.lastIndexOf(attrName);
  // if attrIndex is before the last attribute with same name it means its overridden
  return attrIndex <= lastIndex;
}

export default function partsToNode(
  parts,
  values,
  oldValues,
  context,
  forceUpdate,
  isSvgPart,
  root,
) {
  const children = [];
  for (let i = 0, ln = parts.length; i < ln; i++) {
    let part = parts[i];
    const value = values[i];
    const oldValue = oldValues[i];

    const { isAttribute, isNode } = part;

    let node = brahmosNode();

    if (isAttribute) {
      const { domNode } = part;

      // mix all the consecutive attributes if they belong to same domNode
      const dynamicAttributes = {};
      while (part && domNode === part.domNode) {
        loopEntries(values[i], (attrName, attrValue) => {
          const overrideAttrNameCheck = MODIFIED_ATTRIBUTES[attrName];
          const isOverridden = isAttrOverridden(
            part.tagAttrs,
            overrideAttrNameCheck,
            part.attrIndex,
          );
          if (!isOverridden && !RESERVED_ATTRIBUTES[attrName]) {
            dynamicAttributes[attrName] = attrValue;
          } else if (attrName === 'ref') {
            // Note only functional refs are supported
            setRef(attrValue, domNode);
          }
        });
        part = parts[++i];
      }

      // reduce the counter to correct the loop index. As it is extra incremented in while loop
      i--;

      const { __brahmosData: brahmosData } = domNode;
      const oldDynamicAttributes = brahmosData.attributes || {};

      // store the dynamic attribute reference on node so it can be used on next render
      brahmosData.attributes = dynamicAttributes;

      node.value = dynamicAttributes;
      node.oldValue = oldDynamicAttributes;

      updateNodeAttributes(domNode, dynamicAttributes, oldDynamicAttributes, isSvgPart);
    } else if (isNode) {
      if (isBrahmosNode(value)) {
        node = value;
      } else {
        node.value = value;
      }

      node.oldValue = oldValue;

      // check if node is used earlier
      updateNode(part, value, oldValue, context, forceUpdate, isSvgPart);
    }

    node.part = part;
    node.isSvgPart = isSvgPart;

    children.push(node);
  }

  /**
   * if the node is the root of the mount
   * call the mount/update handlers once dom nodes are attached
   */
  if (root) {
    applyHandlers();
  }

  return children;
}
