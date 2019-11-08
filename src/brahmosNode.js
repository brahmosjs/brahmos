export const TAG_NODE = Symbol('tag');
export const TAG_ELEMENT_NODE = Symbol('tag-element');
export const CLASS_COMPONENT_NODE = Symbol('class-component');
export const FUNCTIONAL_COMPONENT_NODE = Symbol('functional-component');
export const ARRAY_NODE = Symbol('array');
export const PART_NODE = Symbol('part');
export const ATTRIBUTE_NODE = Symbol('attribute');
export const TEXT_NODE = Symbol('text');
export const NULL_NODE = Symbol('null');

export function isTagNode ({ nodeType }) {
  return nodeType === TAG_NODE || nodeType === TAG_ELEMENT_NODE;
}

export function isComponentNode ({ nodeType }) {
  return nodeType === CLASS_COMPONENT_NODE || nodeType === FUNCTIONAL_COMPONENT_NODE;
}

export function isBrahmosNode (node) {
  return node && (isTagNode(node) || isComponentNode(node));
}

export function brahmosNode (props, values, key) {
  return {
    /** Common node properties */
    nodeType: null,
    key,
    parent: null,
    sibling: null,
    child: null,
    isReused: false,
    added: false,
    ref: null,
    level: -1,
    isArrayItem: false,
    part: null,
    dirty: true,

    /** Component specific properties */
    type: null,
    props,
    componentInstance: null,
    portalContainer: null,
    mountHandler: null,

    /** tag node specific properties */
    element: '',
    values,
    oldValues: [],
    templateNode: null,
    template: null,

    /** text content node or null node */
    text: '',
  };
}

// create a linked list through parent and child
export function link (parent, children) {
  const lastChild = null;
  for (let i = children.length; i > 0; i--) {
    const child = children[i];
    child.sibling = lastChild;
    child.parent = parent;
  }

  parent.child = lastChild;
}
