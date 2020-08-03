import Brahmos, { Component, createContext, useContext, useState } from '../src';

const BrahmosContext = createContext('Brahmos');

// context as static property
class ContextStaticProperty extends Component {
  render() {
    const name = this.context;
    return <div>Hello {name}</div>;
  }
}
ContextStaticProperty.contextType = BrahmosContext;

function ContextConsumer() {
  return <BrahmosContext.Consumer>{(name) => <div>Hello {name}</div>}</BrahmosContext.Consumer>;
}

function UseContext() {
  const name = useContext(BrahmosContext);

  return <div>Hello {name}</div>;
}

export default function ContextExample() {
  const [name, setName] = useState();

  return (
    <div>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <BrahmosContext.Provider value={name}>
        <h3>ContextConsumer</h3>
        <ContextConsumer />

        <h3>ContextStaticProperty</h3>
        <ContextStaticProperty />

        <h3>useContext Hook</h3>
        <UseContext />
      </BrahmosContext.Provider>

      <div>
        <h3>ContextConsumer without Provider</h3>
        <ContextConsumer />
        <h3>useContext without Provider</h3>
        <UseContext />
      </div>
    </div>
  );
}
