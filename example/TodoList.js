import Brahmos, { Component } from '../src';

export default class TodoList extends Component {
  state = { todos: [], text: '' };
  setText = e => {
    this.setState({ text: e.target.value });
  };
  addTodo = () => {
    let { todos, text } = this.state;
    todos = todos.concat(text);
    this.setState({ todos, text: '' });
  };
  render () {
    const { todos, text } = this.state;
    return (
      <form onSubmit={this.addTodo} action="javascript:">
        <input value={text} onInput={this.setText} />
        <button type="submit">Add</button>
        <ul>
          { todos.map((todo, idx) => (
            <li key={idx}>{todo}</li>
          )) }
        </ul>
      </form>
    );
  }
}
