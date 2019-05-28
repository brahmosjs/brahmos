import { Component, html, createElement } from '../src';

const items = ['Sudhanshu', 'Hactor', 'Himanshu', 'Himan'];

// .filter(str => str.startsWith(value))

function Input (props) {
  const { onChange, value, children } = props;
  return (<div>
    {<input type="text" value={value} defaultValue="Sudhanshu" onChange={onChange}/>}
    {children}
  </div>);
}

export default class App extends Component {
  state = {
    value: '',
    error: null,
  }
  static getDerivedStateFromError (error) {
    return { error };
  }
  handleChange = (e) => {
    const { value } = e.target;
    this.setState({ value });
  }
  render () {
    const { name } = this.props;
    const { value, error } = this.state;
    const filteredItems = items.filter(str => str.toLowerCase().startsWith(value.toLowerCase()));

    if (error) {
      return <div>Some Error occurred while rendering {error.message}</div>;
    }

    return (
      <div className="app">
        <span>Hello {name}</span>
        <Input value={value} onChange={this.handleChange}>
          <span>Hello {value}</span>
        </Input>
        <ul>
          {filteredItems.map((item, index) => {
            return <li key={item} >{item}</li>;
          })}
        </ul>
      </div>
    );
  }
}
