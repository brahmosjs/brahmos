import associateInstance from './associateInstance';
import { setCurrentComponent } from './hooks';

export default function functionalComponentInstance (FuncComponent) {
  return {
    __render (props) {
      setCurrentComponent(this);
      const nodes = FuncComponent(props);

      // associate instance from the old node to the new rendered node
      associateInstance(nodes, this.__nodes);

      this.__nodes = nodes;
      return nodes;
    },
  };
}
