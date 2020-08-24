import Brahmos, { Component } from 'brahmos';

// Source: https://stackoverflow.com/a/12646864
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Source: https://stackoverflow.com/a/25821830
function randomColor() {
  return `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, '0')}`;
}

export default class TodoList extends Component {
  static defaultProps = {
    maxCount: 5,
    showDescription: true,
  };

  state = { todos: [], text: '' };

  componentDidUpdate(prevProps, prevState) {
    /**
     * Imperatively updating background on first color-code item,
     * to demonstrate element are persisted on shuffle
     */
    if (prevState.todos.length !== this.state.todos.length) {
      document.querySelector('.color-code').style.background = randomColor();
    }
  }

  setText = (e) => {
    this.setState({ text: e.target.value });
  };

  addTodo = () => {
    const { todos, text } = this.state;
    const { maxCount } = this.props;
    if (!text || maxCount === todos.length) {
      return;
    }
    const todo = {
      text,
      id: todos.length,
    };
    this.setState({ todos: [todo, ...todos], text: '' });
  };

  shuffle = () => {
    const { todos } = this.state;
    this.setState({ todos: shuffleArray(todos) });
  };

  render() {
    const { todos, text } = this.state;
    const { maxCount, showDescription } = this.props;
    return (
      <>
        {showDescription && (
          <p>
            This demo demonstrates states, list and keyed list in Brahmos. A color code is also
            added imperatively through DOM APIs to demonstrate keyed list are persisted (just
            rearranged) on addition or shuffle.
          </p>
        )}

        <form onSubmit={this.addTodo} action="javascript:">
          <div className="field has-addons">
            <div className="control">
              <input className="input small-width" value={text} onChange={this.setText} />
            </div>
            <div className="control">
              <button className="button is-dark" type="submit">
                Add
              </button>
            </div>
          </div>
        </form>
        <br />
        <p>Latest todo item is added on top. Add 3 items or more to shuffle the list</p>
        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                }}
                className="color-code"
              ></span>{' '}
              {todo.text}
            </li>
          ))}
        </ul>
        <div className="control-wrap">
          {!!todos.length && maxCount > todos.length && (
            <span>You can add {maxCount - todos.length} items to this list &nbsp;</span>
          )}
          {maxCount === todos.length && <span>List is Full &nbsp;</span>}
          {todos.length > 2 && (
            <button className="button is-dark" type="button" onClick={this.shuffle}>
              Shuffle
            </button>
          )}
        </div>
      </>
    );
  }
}
