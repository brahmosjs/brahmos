import { Component, html, createElement } from '../src';

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
    value: 'test',
  }
  handleChange = (e) => {
    const { value } = e.target;
    this.setState({ value });
  }
  render () {
    const { name } = this.props;
    const { value } = this.state;
    return (
      <div id="test">
        <span>Hello {name}</span>
        <Input value={value} onChange={this.handleChange}>
          <span>Hello {value}</span>
        </Input>
        <span class="from"> ({value})</span>
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
