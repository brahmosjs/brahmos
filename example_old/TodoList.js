import Brahmos, { Component } from '../src';

export default class TodoList extends Component {
  static defaultProps = {
    maxCount: 5,
  };

  state = { todos: [], text: '' };

  setText = (e) => {
    this.setState({ text: e.target.value });
  };

  addTodo = () => {
    let { todos, text } = this.state;
    const { maxCount } = this.props;
    if (!text || maxCount === todos.length) {
      return;
    }
    todos = todos.concat(text);
    this.setState({ todos, text: '' });
  };

  componentDidMount() {
    // console.log('TODO List mounted');
  }

  render() {
    const { todos, text } = this.state;
    const { maxCount } = this.props;
    return (
      <form onSubmit={this.addTodo} action="javascript:">
        <input value={text} onInput={this.setText} />
        <button type="submit">Add</button>
        <ul>
          {todos.map((todo, idx) => (
            <li key={idx}>{todo}</li>
          ))}
        </ul>
        {maxCount > todos.length && (
          <span>You can add {maxCount - todos.length} items to this list</span>
        )}
        {maxCount === todos.length && <span>List is Full</span>}
      </form>
    );
  }
}
