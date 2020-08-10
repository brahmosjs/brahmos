<h2> ⚠️ Warning: This document is stale, a lot has been changed since this doc was published. This need's to be updated. </h2>

This document is to explain how Brahmos work, its concept, internals and taxonomies. This is a good place for the contributors and people who want to understand the inner working of the Brahmos.

This doc tries to cover the different parts of Brahmos and explains what they do. Links to the source files are also added so you can dive deep through code and comments as well.

This doc tries to be as much as descriptive so that you can understand the internals of Brahmos. But if things are unclear and you have some ideas to improve it, please raise an issue or submit a PR.

- [Concept](#concept)
- [Brahmos Transformation (with babel-plugin-brahmos)](#brahmos-transformation-with-babel-plugin-brahmos)
    - [Basic html with dynamic value](#basic-html-with-dynamic-value)
    - [Html with Custom Component](#html-with-custom-component)
    - [More complex transformation](#more-complex-transformation)
- [Tag function `html`](#tag-function-html)
- [createElement](#createelement)
- [Brahmos Nodes](#brahmos-nodes)
    - [Brahmos Tag Node](#brahmos-tag-node)
    - [Brahmos Component Node](#brahmos-component-node)
    - [Brahmos Element Node](#brahmos-element-node)
    - [Brahmos String Node](#brahmos-string-node)
    - [Brahmos Array Node](#brahmos-array-node)
- [Brahmos node tree](#brahmos-node-tree)
- [TemplateTag](#templatetag)
- [TemplateNode](#templatenode)
- [Class Component](#class-component)
- [Functional Component](#functional-component)
- [Associating instance](#associating-instance)
- [Updater](#updater)
  - [Attribute updater](#attribute-updater)
  - [Node updater](#node-updater)
    - [Non renderable node](#non-renderable-node)
    - [Component node](#component-node)
    - [Tag node & Element node](#tag-node--element-node)
    - [Array nodes](#array-nodes)
    - [Text nodes](#text-nodes)
- [Tear down](#tear-down)

## Concept

Brahmos is a lightweight implementation of React without VDOM. It has the same declarative API like React, but instead of working with VDOM, it uses tagged template literals and HTML's template tag for faster rendering and updates. It divides the HTML to be rendered into static and dynamic parts, and in next render, it has to compare the values of only dynamic parts and apply the changes optimally to the connected DOM. It's unlike the VDOM which compares the whole last rendered VDOM (which has both static and dynamic parts) with the new VDOM to derive the optimal changes that are required on the actual DOM.

It has the exact same API as React but the Brahmos compiler and the renderer makes this library different. Let's see how it works.

## Brahmos Transformation (with babel-plugin-brahmos)

A developer writes code in JSX and the babel-plugin-brahmos transform code to templateLiteral.

Here are example of few transformation.

#### Basic html with dynamic value

```jsx
<div className="greet">
  Hello <span className="name">{name}</span> !!
</div>
```

In Brahmos this will be transformed to.

```js
html`
  <div class="greet">Hello <span class="name">${name}</span> !!</div>
`;
```

Compared to React

```js
React.createElement(
  'div',
  {
    className: 'greet',
  },
  'Hello ',
  React.createElement(
    'span',
    {
      className: 'name',
    },
    name,
  ),
  ' !!',
);
```

With the string literal, you can see there is a clear separation between static and dynamic part.

#### Html with Custom Component

```jsx
<div className="greet">
  Hello <Name value={name} /> !!
</div>
```

Brahmos:

```js
html`
  <div class="greet">
    Hello ${createElement(Name, { value: 'name' })} !!
  </div>
`;
```

React:

```js
React.createElement(
  'div',
  {
    className: 'greet',
  },
  'Hello ',
  React.createElement(Name, {
    value: name,
  }),
  ' !!',
);
```

- For Custom component it uses the syntax createElement similar to React as they cannot be converted to the template tag. With the first argument being a Component reference, the 2nd argument being props followed by children.
- The output of createElement of Brahmos is slightly different than the React.
- This also enables support for third-party React component to be used along with Brahmos.

#### More complex transformation

```jsx
<div className="items">
  <Item>
    <img className="item-img" src={itemImg} alt={itemShortDesc} />
    <p>{itemDesc}</p>
    <button className="add-item" onClick={this.addItem}>
      Add
    </button>
  </Item>
</div>
```

Brahmos:

```js
html`
  <div class="items">
    ${createElement(
      Item,
      {},
      html`
        <img class="item-img" ${{ src: itemImg, alt: itemShortDesc }} />
        <p>${itemDesc}</p>
        <button className="add-item" ${{ onClick: this.addItem }}>
          Add
        </button>
      `,
    )}
  </div>
`;
```

React:

```js
React.createElement(
  'div',
  {
    className: 'items',
  },
  React.createElement(
    Item,
    null,
    React.createElement('img', {
      className: 'item-img',
      src: itemImg,
      alt: itemShortDesc,
    }),
    React.createElement('p', null, itemDesc),
    React.createElement(
      'button',
      {
        className: 'add-item',
        onClick: (void 0).addItem,
      },
      'Add',
    ),
  ),
);
```

- Dynamic attributes are transformed into key-value pairs while also maintaining the node reference of that dynamic attributes.
- A tagged template literal can be passed as children of createElement call. Children can be string, tagged component literal, another custom component or array of all this.
- We can also see how the overall footprint of Brahmos output is smaller than the JSX output. And bigger the static part bigger the difference will be more.

## Tag function `html`

Source: [https://github.com/s-yadav/brahmos/blob/master/src/tags.js](https://github.com/s-yadav/brahmos/blob/master/src/tags.js)

On the code transformed by Brahmos, we see the ES6 template literal with a tag.
Tags are nothing but a function which receives an array of the literal part (static part) followed by all expressions (values).

```js
function html(strings, ...values) {
  // string ['<div class="greeting">\nHello <span class="name">', '</span> !!\n</div>']
  // values = [name]
}
```

A tag function doesn't have to return only the string, it can return anything. The html tag function returns an object (Brahmos Tag Node) which contains TemplateTag instance (which we will see later) and an array of dynamic expressions.

Brahmos Tag Node

```js
{
  template: templateTagInstance,
  values: [name],
}
```

Also on a tag function, the reference of string array remains the same for a given template. We use this behaviour to cache the templateTagInstance for a given literal (static) part and reuse it for next calls.

## createElement

Source: https://github.com/s-yadav/brahmos/blob/master/src/createElement.js

createElement API is similar to react where the first argument is an element (component reference or a string), the second argument is for props followed by children.

It returns the Brahmos element node if a string is passed as the first argument and returns the Brahmos component node if component reference is passed.

Brahmos Element Node

```js
{
  element: 'div',
  values: [attributes, children]
}
```

Brahmos Component Node

```js
{
  type: BrahmosComponent,
  props: {
    ...allPassedProps,
    children,
  }
  key,
  ref,
}
```

Similar to React children are passed as a prop. key and ref are reserved props and are not passed to the component.

## Brahmos Nodes

Brahmos has different types of nodes which are handled and updated differently on first render or updates.

#### Brahmos Tag Node

This is returned by tagged template, which looks like

```js
{
  template: templateTagInstance,
  values: [...dynamicExpressions],
  __$isBrahmosTag$__: true,
}
```

#### Brahmos Component Node

- Brahmos component node is further divided into `Class Component Node` and `Functional Component Node`.
- Component nodes are returned by the createElement call with custom component.

```js
{
  type: BrahmosComponent,
  props: {
    ...allPassedProps,
    children,
  }
  key,
  ref,
  __$isBrahmosComponent$__: true,
  __$isBrahmosClassComponent$__: true | false,
  __$isBrahmosFunctionalComponent$__: true | false,
}
```

#### Brahmos Element Node

- This is returned by the createElement call with HTML elements tagName instead of custom component.

```js
{
  element: 'div',
  values: [attributes, children],
  __$isBrahmosTag$__: true,
  __$isBrahmosTagElement$__: true,
}
```

#### Brahmos String Node

- This is a simple string and is rendered as a text node.

#### Brahmos Array Node

- This is an array of the above types of nodes.

## Brahmos node tree

Based on the different types of nodes Brahmos forms a node tree. Unlike the VDOM which is a tree representation of the actual dom, Brahmos maintains a tree of Brahmos nodes. So the depth of the Brahmos node is much smaller than VDOM.

For the following JSX

```jsx
<div className="items">
  <Item>
    <img className="item-img" src={itemImg} alt={itemShortDesc} />
    <p>{itemDesc}</p>
    <button className="add-item" onClick={addItem}>
      Add
    </button>
  </Item>
</div>
```

Brahmos tree will look like

```js
{
  template: templateTagInstance, // for the outer div
  values: [{
    type: Item,
    props: {
      children: {
        template: templateTagInstance, // for the Item content
        values: [itemImg, itemShortDesc, itemDesc, addItem]
      }
    },
    __$isBrahmosComponent$__: true,
  }]
  __$isBrahmosTag$__: true,
}
```

Compared to React VDOM tree which looks like

```js
{
  type: 'div',
  props: {
    className: 'items',
    children: [{
      type: 'item',
      props: {
        children: [{
          type: 'img' ,
          props: {
            className: 'item-img',
            src: itemImg,
            alt: itemShortDesc,
          }
        }, {
          type: 'p',
          props: {
            children: [itemDesc]
          },
        }, {
          type: 'button',
          props: {
            className: 'add-item',
            onClick: addItem,
            children: ['Add']
          }
        }]
      }
    }]
  }
}
```

The Brahmos tree is then recursively analyzed to associate proper node instances and to render.

## TemplateTag

Source: https://github.com/s-yadav/brahmos/blob/master/src/TemplateTag.js

TemplateTag class has two responsibilities.

1. Create a template tag (HTML tag) for a given literal part (static part).
2. Create basic parts metadata.

For a given template

```js
html`
  <div class="greeting" {{onClick: handleClick}}>Hello <span class="name">${name}</span> !!</div>
`();
```

TemplateTag Class will create a template tag which will look like

```html
<template>
  <div class="greeting" data-brahmos-attr>
    Hello <span class="name"><!--{{brahmos}}--></span> !!
  </div>
</template>
```

It adds placeholder for attribute part and node part so parts can be processed easily later.

It will also create dynamic part metadata. For the above template this will look like

```js
[
  {
    tagAttrs: ['class'], //this are all other attributes other than dynamic attributes.
    attrIndex: 1, // store the location of dynamic attribute part
    isAttribute: true,
  },
  {
    isNode: true,
  },
];
```

- For the tag attribute, we store the index (location) of dynamic attribute so attribute can be applied in order without overriding attributes which it shouldn't.

For example

```js
html`<div id="someId" {{id: 'someOtherId'}}></div>
```

This should have `someOtherId` as id. While

```js
html`<div {{id: 'someOtherId'}} id="someId"></div>
```

This should have `someId` as id.

attrIndex helps to figure out which one to apply in such cases.

creating a template tag and part metadata is deferred until the first render of that component. This is required as some information is available during the render time only like whether a template is part of an SVG or the normal HTML.

## TemplateNode

Source: https://github.com/s-yadav/brahmos/blob/master/src/TemplateNode.js

TemplateNode class do two things

1. Create DOM nodes from the template tag removing the placeholders.
2. Create part information using placeholder location and parts metadata from the templateTagInstance.

Each of Brahmos tag node has different TemplateNode instance, but it remains the same for all consecutive renders till it has same TemplateTag instance.

If TemplateTag instance does not have template tag and part metadata created, TemplateNode initializes that on TemplateTag Instance.

TemplateNode then clones the template tag and remove place holders and creates the part information which has actual DOM references of dynamic locations.

Node which is appended to dom

```html
<div class="greeting">Hello <span class="name"></span> !!</div>
```

Part information

```js
[{
  tagAttrs: ['class'],
  attrIndex: 1,
  isAttribute: true,
  node: Element, //div.greeting
}, {
  isNode: true,
  parentNode: Element //span.name
  previousSibling: null, //null because there is no previousSibling of the dynamic part
  nextSibling: null, // null because there is no nextSibling of the the dynamic part
}]
```

Now with this part information, dynamic parts can be updated directly as now we know the actual DOM locations for those dynamic parts.

On creation of TemplateNode instance, it attaches this instance to Brahmos tag node so it can be used later.

```js
{
  template: templateTagInstance,
  values: [...dynamicExpressions],
  templateNode: templateNodeInstance,
  __$isBrahmosTag$__: true,
}
```

## Class Component

Source: https://github.com/s-yadav/brahmos/blob/master/src/Component.js

Class Component API is exactly the same as the React. There are few implementation changes though from the React.

- The deprecated life cycle methods are not supported. Even unsafe life cycle methods are not supported.
- setState calls batch all the state change and are always asynchronous.

Class Component keeps the last rendered node information so on next render it can associate proper instance to each of Brahmos Node.

During the render, the updater creates ComponentInstance and attaches it to the Brahmos component node.

```js
{
  type: Component,
  props: {...}
  componentInstance: classComponentInstance,
}
```

## Functional Component

Source: https://github.com/s-yadav/brahmos/blob/master/src/functionalComponentInstance.js

Functional Component is written the same way as React,
While rendering Brahmos creates an instance of a functional component and associate the instance to Brahmos Component node.

```js
{
  type: Component,
  props: {...}
  componentInstance: functionalComponentInstance,
}
```

## Associating instance

Source: https://github.com/s-yadav/brahmos/blob/master/src/associateInstance.js

This is key to making optimal updates. On rerender of a Brahmos node, the associateInstance method associate already created templateNodeInstance, or componentInstance to the new node, so it gets the reference of dynamic parts on the actual dom node.

If a node does not get an associated instance it means it is a new node and old node needs to be removed and the new one should get added.

The instance association to the new node happens with following rules.

- If the new node and old node at a specific tree path are different types, then return without associating anything.
- If the new node is a Brahmos tag node, and the templateTag instance of new node and old node is same then associate the templateNode instance to the new node. (If the literal part of a template is same, the templateTag instance will always remain same)
- If the new node is a Brahmos component node and the node.type matches with oldNode.type then it associates component instance form the old node to the new node.
- If the new node is Brahmos element node, and the element tagName matches with the oldNode's tagName then it associates templateNode instance to the new node.
- If the new node is an array, each of the nodes in that array is matched with the item in the old node having the same index or the same key. And if they match based on the above condition instance are associated with the node.

## Updater

Source: https://github.com/s-yadav/brahmos/blob/master/src/updater.js

An updater is a place where all rendering or updates happens. It recursively updates all the Brahmos node on the tree. There are three main arguments of an updater.

- parts, which is an array of dynamic part and have information about DOM location and type of part (attribute or node).
- values, which is an array of dynamic values.
- oldValues, an array of old values against which the updater can compare and only if there is a change in value apply the changes to the DOM.

There are different types of updates with two categories.

- Attribute updater
- Node updater

Apart from calling proper updater it takes care of two more thing

- Merge all dynamic attribute for a dom node, so it can be effectively updated.
- Set proper ref if ref prop is passed to an element.

### Attribute updater

Source: https://github.com/s-yadav/brahmos/blob/master/src/updateAttribute.js

- Attribute updater takes care of updating the attribute of a given node based on the index of that attribute. This information comes from the part object.
- It handles dom node property and attributes differently.
- For event properties, it takes care of removing old event listeners (if the eventListener is changed) and add new event listeners.
- To be React compatible it has synthetic events only for inputs. It has the same onChange API as react. https://github.com/s-yadav/brahmos/blob/master/src/reactEvents.js
- For inputs, it takes care of controlled and uncontrolled input similar to React. https://github.com/s-yadav/brahmos/blob/master/src/reactEvents.js

### Node updater

Source: https://github.com/s-yadav/brahmos/blob/master/src/updateNode.js

Node updater handles rendering and updates of different type of Brahmos node.

#### Non renderable node

For non-renderable values like `null`, `undefined`, `false`, it bails out and
remove the existing old node if present on that location.

#### Component node

Source: https://github.com/s-yadav/brahmos/blob/master/src/updateComponentNode.js
`updateComponentNode` handles updating a component node. It creates a component instance and associates the instance to the component node if it's not already created.

For class components

- it calls all the applicable life cycle methods if provided and renders with the error boundaries.
- It applies and flushes all the uncommitted state if present for that component.
- It also takes care or providing proper context to a component and merge contextValue provided by the ContextProvider for the component nodes down the tree.
- It sets a proper component reference to ref prop.

For functional component

- It takes care of calling effects after the render and clean the effects before the next render.

#### Tag node & Element node

Source: https://github.com/s-yadav/brahmos/blob/master/src/updateNode.js#L135

- It creates a TemplateNode instance and associates it with Brahmos tag node if it's not already created.
- For the element node, it creates an object similar to templateNode (if not created already) and associates it to the node. https://github.com/s-yadav/brahmos/blob/master/src/TagNode.js
- For the first render, it adds everything on a document fragment and adds it to DOM at the end to avoid multiple reflows.

#### Array nodes

Source: https://github.com/s-yadav/brahmos/blob/master/src/updateNode.js#L91

- Array's are optimally updated based on provided keys. It reuses the same DOM element even if the order changes (if proper keys are provided).
- It takes care of optimally removing unused old nodes, reordering of nodes and adding new nodes.

#### Text nodes

Source: https://github.com/s-yadav/brahmos/blob/master/src/updateNode.js#L23

- For text nodes, it finds the existing text node at the DOM tree path and only updates the text value avoiding creating new text node.

## Tear down

Source: https://github.com/s-yadav/brahmos/blob/master/src/tearDown.js
Tear down is a way to recursively delete a path from a given node on the Brahmos tree. It takes care of the following things.

- Unmount the components and call life cycle methods for the class component.
- Clean the effects on a functional component.
- Unset the refs.
- Delete the dom nodes.
