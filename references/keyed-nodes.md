We can use following to update looped items, and update dom efficiently.

Assumptions:
- Each nodeItem will have the last position, currentPosition and last nodeItem reference.
- Each nodeItem will be storing effectivePosition


Steps:
- If length of last nodeList element is > than the current nodeList elements. You have to remove all nodes between the last item of the new node list and the nextSibling value from the part. 
- If newPosition and effectivePosition is not same, add the element on the correct position.
- If the element is string and the last node is not text we can recreate it. 
- If the element does not have associated node, create the element
- If any thing is changed from the last 

```js

function isArrayNodesChanged (nodes, oldNodes) {
  const nodesLength = nodes.length;
  if (!oldNodes || nodesLength !== oldNodes.length) return true;
  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    const oldNode = oldNodes[i];
    if (node && isReactLitNode(node)) {
      /**
       * If node has a key, and old node is present and old node's key and newNode keys match
       * then the value is not changed, if not then return true
       */
      if (!(node.key && oldNodes && node.key === oldNode.key)) return true;
    } else if (isReactLitNode(oldNode)) {
      /**
       * if oldNode is reactLitNode and new node is not (that will be checked on last if )
       * then return true
       */
      return true;
    }
    // No need to match two non ReactLitNodes
  }
}

function updateArrayNodes (part, node, oldNode = []) {
  const { parentNode, previousSibling, nextSibling } = part;

  const nodeLength = Math.max(node.length, oldNode.length);
  
  const nodesChanged = isArrayNodesChanged(node, oldNode);
  
  if (nodesChanged) {
    const fragement = document.createFragm
  }

  let lastNodeOnLoop;
  const domNodes = [];
  for (let i = 0, ln = node.length; i < ln; i ++) {
    const currentNode = node[i];
    if () {

    } else {
      domNodes.push(document.createTextNode(currentNode.toString()));
    }
  }



  for (let i = 0, ln = nodeLength; i < ln; i++) {
    const currentNode = node[i] || {};
    /**
     * get the last node which we will using as previous siblings.
     * For the first fragment it will be previousSibling value of the part,
     * for the next fragment it will be last element of the fragment nodes.
     */

    let _previousSibling = previousSibling;

    if (i > 0) {
      const lastNodes = node[i - 1].templateNode.nodes;
      _previousSibling = lastNodes[lastNodes.length - 1];
    }

    // update the node and child elements if required
    updateNode({
      parentNode,
      previousSibling: _previousSibling,
      nextSibling,
    }, currentNode);
  }
}
```