# brahmos 🚀
Supercharged UI library with modern React API and native templates.

## Features
- Lightweight and Fast.
- Exact same React Declarative APIs with JSX.
- Fast alternative to Virtual DOM. (JSX without VDOM).
- Smaller transpiled footprint of your source code, then JSX.  

## How it works?
It is inspired by the rendering patterns used on hyperHTML and lit-html.
It has same declarative API exactly like React, but instead of creating VDOM and diffing VDOMs in every render, it divides the rendered DOM into static part and dynamic part and it has to compare only dynamic part in next render, reducing the cost of diffing. It has direct access to the dom nodes for the dynamic parts and can apply the changes on dynamic part instantly.

It does this by transpiling JSX to tagged template literals.

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

It will be transpiled to
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

With this now we have a clear static and dynamic part separation. And on any dynamic value change we can optimally compare only the dynamic parts (expressions) and apply the changes directly to connected DOM.

Tagged template literals also have unique property where the reference of static string array on every call of the tag will always remain same if the static part is same. No matter how may times they are called, or from where ever they are called.
With this we can use string array as a cache key and return the same intermediate html template the library creates.

Tagged template is natively supported by browser unlike the JSX which has to be transpiled to React.createElement calls. So the output generated to run brahmos has smaller footprint than the output generated for the react. 
For the above example the Brahmos output is 685 bytes, compared to 824 bytes from the React output. More the static html part greater the difference will be.


## Demo
Todo MVC with Brahmos
[https://s-yadav.github.io/brahmos-todo-mvc](https://s-yadav.github.io/brahmos-todo-mvc)


## Progress
- [x] Component and props
- [x] States and setState
- [x] Functional Component and props
- [x] List
- [x] Keyed list
- [x] Synthetic input events - onChange support
- [x] Babel Plugin to transpile JSX to tagged template
- [ ] Life cycle events
- [ ] PureComponent
- [ ] Context API
- [ ] Hooks
- [ ] React Utilities and Methods
- [ ] SVG Support
- [ ] Handle server rendering
- [ ] Performance improvement
- [ ] Bug fixes
- [ ] Test Cases
