
import updater from './updater';

export default function render (node, target) {
  const part = {
    parentNode: target,
    isNode: true,
  };
  updater([part], [node], [], true);
}
