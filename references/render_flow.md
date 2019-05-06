- The top level render will receive a target and an instance.
```jsx
ReactLit.render(<App someProp="2" />, document.getElementById('container'));
```
Which translates to 
```jsx
ReactLit.render(createElement(App, {someProp: 2}), target);
```
 
- Inside render create the part, treat as we are just having expression and no values.
```js
function render(node, target) {
  //node looks like this
  node = {
    type: App,
    props: {someProps: '2'}
    __isReactLitFunctionComponent__: true,
    __isReactLitClassComponent__: true,
  };

  part = {
    parent: target,
    nextSibling: null,
    previousSibling: null,
    isNode: true,
  }
}
```

- Get the older instance and if available, We can store the instance on the target for the top level item.
```js
function render(node, target) {
  //...
  const { instance } = target; // get the instance using target element

  if (instance) {
    updater(parts, props, olderProps);
  }
}
```

- Inside a component, we will map all the occurrence of htmlParts (we will have node template instance for this) and reactNodeParts (we will have component instance for this).

```js

function componentRender() {
  const componentInstance = this;
  const { instances } = this;
  const nodes = this.render(); // take reference from react-lit-output

  const instanceCounter = 0;

  function associatInstances(nodes) {
    // handle array results
    if (Array.isArray(nodes)) {
      for (let i = 0, ln = nodes.length; i < ln; i++) {
        associatInstances(nodes[i]);
      }
      //handle keyed nodes when array is encountered.

    // handle react lit tag
    } else if (node.__isReactLitTag__) {
      let instance = instances[instanceCounter];

      if (!instance) {
        instance = new TemplateNode(instance.template, componentInstance);
        instances[instanceCounter] = instance;
      }
      
      // check if we want to start rendering here. In this phase mostly we want to associate proper instances on the 

      //increase the counter so we can get the next place holder
      instanceCounter++;
    } else if (node.__$isReactLitComponent$__) {
      let instance = instances[instanceCounter];

      if (instance) {
        if (instance.type !== node.type || instance.key !== node.key) {
          instance = null; //we want to re render the whole part here, as we consider on type change the whole sub tree changes.
        } else {
          // set info that the component is already mounted
          instance.mounted = true;
        }
      } 

      // we are setting instance = null conditionally on previous condition,
      // so the !instance check will work here 
      if (!instance) {
        if (node.__$isReactLitFunctionalComponent__) {
          instance = createFunctionalComponentInstance(node);
        } else {
          instance = createClassComponentInstance(node)
        }
      }
    }
  }
}
```

```js
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
