import Brahmos, { Component, useState } from '../src';

const items = ['Sudhanshu', 'Hactor', 'Himanshu', 'Himan'];

// .filter(str => str.startsWith(value))

function Input (props) {
  const { onChange, value, children } = props;
  return (<div>
    {<input type="text" value={value} defaultValue="Sudhanshu" onChange={onChange}/>}
    {children}
  </div>);
}

function Increment2 () {
  const [state, setState] = useState(1);

  return <button onClick={() => setState(state + 1)}>Increment: {state}</button>;
}

function Increment () {
  const [state, setState] = useState(1);

  return (<div>
    <button onClick={() => setState(state + 1)}>Increment: {state}</button>;
    <Increment2 />
  </div>);
}

export default class App extends Component {
  state = {
    value: '',
  }
  handleChange = (e) => {
    const { value } = e.target;
    this.setState({ value });
  }
  render () {
    const { name } = this.props;
    const { value } = this.state;
    const filteredItems = items.filter(str => str.toLowerCase().startsWith(value.toLowerCase()));

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
        <Increment />
      </div>
    );
  }
}
