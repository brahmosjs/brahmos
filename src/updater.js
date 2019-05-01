import './styles.css';
import { parts, node } from './get_parts';

document.getElementById('app').innerHTML = `
<h1>Hello Vanilla!</h1>
<div>
  We use Parcel to bundle this sandbox, you can find more info about Parcel
  <a href="https://parceljs.org" target="_blank" rel="noopener noreferrer">here</a>.
</div>
`;

function isAttrOverridden (tagAttrs, attrName, attrIndex) {
  const lastIndex = tagAttrs.lastIndexOf(attrName);
  return lastIndex !== -1 && lastIndex !== attrIndex;
}

function setAttribute (node, attrName, attrValue) {
  /*
    if node has property with attribute name, set the value directly as property
    otherwise set it as attribute
  */

  if (attrName in node) {
    node[attrName] = attrValue;
  } else {
    node.setAttribute(attrName.toLowerCase(), attrValue);
  }
}

function deleteNodesBetween (parent, start, end) {
  if (!start && !end) {
    parent.innerHTML = '';
    return;
  }

  let node;

  if (!start) {
    node = parent.firstChild;
  } else {
    node = start.nextSibling;
  }

  while (node && node !== end) {
    node.parent.removeChild(node);
    node = node.nextSibling;
  }
}

function changeToNode (value) {
  if (value instanceof Node) {
    return value;
  }

  return document.createTextNode(value.toString());
}

function addNodesBetween (parent, start, end, value) {
  const node = changeToNode(value);
  if (!start && !end) {
    parent.appendChild(node);
  } else if (!start) {
    end.insertAdjacentElement('beforebegin', node);
  } else {
    start.insertAdjacentElement('afterend', node);
  }
}

function updater (parts, values) {
  for (let i = 0, ln = parts.length; i < ln; i++) {
    const part = parts[i];
    const value = values[i];
    const { isAttrValue, isSpreadAttr, tagAttrs, attrIndex, isNode } = part;

    if (isAttrValue) {
      const { attrName, node } = part;
      if (!isAttrOverridden(tagAttrs, attrName, attrIndex)) {
        setAttribute(node, attrName, value);
      }
    } else if (isSpreadAttr) {
      const keys = Object.keys(value);
      for (let j = 0, keysLn = keys.length; j < keysLn; j++) {
        const attrName = keys[i];
        const attrValue = value[attrName];
        if (!isAttrOverridden(tagAttrs, attrName, attrIndex)) {
          setAttribute(part.node, attrName, attrValue);
        }
      }
    } else if (isNode) {
      const { parentNode, previousSibling, nextSibling } = part;
      deleteNodesBetween(parentNode, previousSibling, nextSibling);
      addNodesBetween(parentNode, previousSibling, nextSibling, value);
    }
  }
}

const values = [
  'something',
  { 'data-test-id': 2, 'data-linked': true },
  'Hello World',
];

console.log('-----', node.content);

if (node.children.length) {
  document.getElementById('app').appendChild(node);
}

updater(parts, values);
