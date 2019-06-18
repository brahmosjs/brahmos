
import updater from './updater';

export default function render (node, target) {
  const part = {
    parentNode: target,
    isNode: true,
  };
  // pass the context as empty object
  updater([part], [node], [], {}, true);
}
