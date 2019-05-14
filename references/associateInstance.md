- To associate instance start from the root node. 

1. Check node has changed
  - If node is templateNode and the template is same
  - If node is componentNode and the type is same
  - If node is an array, and the old one is also an array. (Special case to check for keys)
2. If node mismatches don't traverse down the the tree
3. If node matches associate older instance to the node. So we can update instead of re-render.


```js
function getKey(node, index) {
  return node.key !== undefined ? node.key : index;
}

function formNodeMap(nodes) {
  const maps = {};

  for (let i = 0, ln = nodes.length; i < ln; i++) {
    const node = nodes[i];
    const key  = getKey(node, i);
    maps[key] =  {
      index: i,
      node,
    };
  }

  return maps;
}

function associateInstance(renderTree, lastRenderedTree) {
  const node = renderTree;
  const defaultNode = Array.isArray(node) ? [] : {};
  const oldNode = lastRenderedTree || defaultNode;

  if (Array.isArray(node)) {
    const oldNodesMap = formNodeMap(oldNodes);

    for (let i = 0, ln = nodes.length; i < ln; i++) {
      const node = nodes[i];
      const key  = getKey(node, i);
      const oldNode = oldNodesMap[key];

      if (oldNode) {
        associateInstance(node, oldNode);
      }
    }
  } else if (node.__$isReactLitTag$__) {
    if (node.template !== oldNode.template) {
      return;
    }

    node.templateNode = oldNode.templateNode;

    for (let i = 0, ln = node.expressions.length; i < ln; i ++) {
      associateInstance(node.expressions[i], oldNode.templateNode[i]);
    }
  } else if (node.__$isReactLitComponent$__) {
    if (node.type !== oldNode.type) {
      return;
    }

    node.componentInstance = oldNode.componentInstance;
  }
}
```

- Once we get all the nodes of render to have attached instance. We try to render it.
- On the render nodes we will pass the part information. Which will have parent dom node, or start after node, end before node. 
- If no start and end node is provided it means the passed node is the only children on the parent.
- But the part can have dom node associated with it. In which you want to make all the changes.

```js
function renderNodes(node, part) {
  let firstRender = true;
  if (Array.isArray(node)) {
    
  } else if (node.__$isReactLitTag$__) {
    if (!node.templateNode) {
      node.templateNode = new TemplateNode(node.templates);
      firstRender = false;
    }

  } else if (node.__$isReactLitComponent$__){
    if (!node.componentInstance) {
      
      node.componentInstance =  node.__$isReactLitFunctionalComponent__ ? createFunctionalComponentInstance(node) : createClassComponentInstance(node);
      
      firstRender = false;
    }
  }

  updater([part], [node], firstRender);
}

function createClassComponentInstance(node) {
  const { type, props, key, ref } = node;

  return {
    ...node,
    instance: new node.type(props), 
  }
}

function createFunctionalComponentInstance(node) {
  return {
    ...node,
    ref: null, //as functional component can't have ref set it to null
  }
}
```
