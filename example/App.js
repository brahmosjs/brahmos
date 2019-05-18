import { Component, html, createElement } from '../src';

const items = ['Sudhanshu', 'Hactor', 'Himanshu', 'Himan'];

// .filter(str => str.startsWith(value))

function Input (props) {
  const { onChange, value, children } = props;
  console.log(children);
  return (<div>
    {<input type="text" value={value} defaultValue="Sudhanshu" onChange={onChange}/>}
    {children}
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
      <div id="test">
        <span>Hello {name}</span>
        <Input value={value} onChange={this.handleChange}>
          <span>Hello {value}</span>
        </Input>
        <ul>
          {filteredItems.map((item) => {
            return <li key={item} >{item}</li>;
          })}
        </ul>
      </div>
    );
  }
}

// class Input extends Component {
//   render () {
//     const { onChange, value } = this.props;
//     return html`<input type="text" ${{ value }} ${{ onChange }}>`();
//   }
// }

// export default class App extends Component {
//   state = {
//     value: 'test',
//   }
//   handleChange = (e) => {
//     const { value } = e.target;
//     console.log(value);
//     this.setState({ value });
//   }
//   render () {
//     const { name } = this.props;
//     const { value } = this.state;
//     return html`
//       <div id="test">
//         <span>Hello ${name}</span>
//         ${createElement(Input, { value, onChange: this.handleChange })}
//         <span class="from"> (${value})</span>
//       </div>
//     `();
//   }
// }
