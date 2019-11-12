<p align="center">
  <img src="https://unpkg.com/brahmos@0.5.0/brahmos.svg" alt="Brahmos.js" width="250">
</p>

# Brahmos
Supercharged JavaScript library to build user interfaces with modern React API and native templates.

## Installation

[Create a New Brahmos App](https://www.npmjs.com/package/create-brahmos-app) if you're looking for a powerful JavaScript toolchain.

## Features
- Lightweight and Fast.
- Exact same React's Declarative APIs with JSX.
- Fast alternative to Virtual DOM. (JSX without VDOM).
- Smaller transpiled footprint of your source code, than traditional JSX.

## Idea
It is inspired by the rendering patterns used on hyperHTML and lit-html.

It has the same declarative API like React, but instead of working with VDOM, it uses tagged template literals and HTML's template tag for faster rendering and updates.
It divides the HTML to be rendered into static and dynamic parts, and in next render, it has to compare the values of only dynamic parts and apply the changes optimally to the connected DOM.
It's unlike the VDOM which compares the whole last rendered VDOM to the new VDOM (which has both static and dynamic parts) to derive the optimal changes that are required on the actual DOM.

Even though tagged template literals are the key to static and dynamic part separation, the developer has to code on well adopted JSX.

Using the babel-plugin-brahmos it transforms JSX into tagged template literals which are optimized for render/updates and the output size.

Consider this example,
```jsx
class TodoList extends Component {
  state = { todos: [], text: '' };
  setText = e => {
    this.setState({ text: e.target.value });
  };
  addTodo = () => {
    let { todos, text } = this.state;
    this.setState({
      todos: todos.concat(text),
      text: '',
    });
  };
  render () {
    const { todos, text } = this.state;
    return (
      <form className="todo-form" onSubmit={this.addTodo} action="javascript:">
        <input value={text} onChange={this.setText} />
        <button type="submit">Add</button>
        <ul className="todo-list">
          { todos.map(todo => (
            <li className="todo-item">{todo}</li>
          )) }
        </ul>
      </form>
    );
  }
}
```

It will be transformed to
```js
class TodoList extends Component {
  state = { todos: [], text: '' };
  setText = e => {
    this.setState({ text: e.target.value });
  };
  addTodo = () => {
    let { todos, text } = this.state;
    this.setState({
      todos: todos.concat(text),
      text: '',
    });
  };
  render () {
    const { todos, text } = this.state;
    return html`<form class="todo-form" ${{ onSubmit: this.addTodo }}
      action="javascript:">
        <input ${{ value: text }} ${{ onChange: this.setText }} />
        <button type="submit">Add</button>
        <ul class="todo-list">
          ${todos.map(todo => html`<li class="todo-item">${todo}</li>`())}
        </ul>
      </form>`();
  }
}
```

With the tagged template literal we get a clear separating of the static and dynamic part. And on updates it needs has to apply changes only on the changed dynamic parts.

Tagged template literals also have a unique property where the reference of the literal part (array of static strings) remain the same for every call of that tag with a given template.
Taking advantage of this behaviour Brahmos uses literal parts as a cache key to keep the intermediate states to avoid the work done to process a template literal again.

Tagged template is natively supported by the browser, unlike the React's JSX which has to be transformed to React.createElement calls. So the output generated to run Brahmos has a smaller footprint than the output generated for the react.
For the above example, the Brahmos output is 685 bytes, compared to 824 bytes from the React output. More the static part of an HTML,  greater the difference will be.


## How it works?
Check how it internally works [HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md)

## Demo
Todo MVC with Brahmos
[https://s-yadav.github.io/brahmos-todo-mvc](https://s-yadav.github.io/brahmos-todo-mvc)

## Slack Channel
https://brahmoscommunity.slack.com/join/shared_invite/enQtNjYxODIzMzA3NTg3LWY5ZWY4ZjczNThhMTZjN2Q3NTNmMTBjNjVlZGM5ZWMzNDIyYWI2OTUwMTZiOGQ5MjEwN2Q0ZGRkM2UxZjFiZTM

## Progress
- [x] Component and props
- [x] States and setState
- [x] Functional Component and props
- [x] List
- [x] Keyed list
- [x] Synthetic input events - onChange support
- [x] Babel Plugin to transpile JSX to tagged template
- [x] Life cycle methods (Only non deprecated methods)
- [x] PureComponent
- [x] Hooks
- [x] Context API
- [x] Refs Api, createRef, ref as callback, forwardRef
- [x] SVG Support
- [ ] React Utilities and Methods
- [ ] Handle server rendering
- [ ] Performance improvement
- [ ] Bug fixes
- [ ] Test Cases
- [ ] 3rd Party React Component support (In Progress, partially supported)
