import associateInstance from './associateInstance';

export default function functionalComponentInstance (FuncComponent) {
  return {
    __render (props) {
      const nodes = FuncComponent(props);

      // associate instance from the old node to the new rendered node
      associateInstance(nodes, this.__nodes);

      this.__nodes = nodes;
      return nodes;
    },
  };
}
