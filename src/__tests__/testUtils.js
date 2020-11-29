import * as testLib from '@testing-library/dom';
import { render, unmountComponentAtNode } from '..';

const queryMethodRegex = /^(getBy|findBy|queryBy|getAllBy|findAllBy|queryAllBy)/;

const containersList = [];

export function unmountAll() {
  containersList.forEach(unmountComponentAtNode);
}

function renderNode(node) {
  const container = document.createElement('div');
  const ref = render(node, container);

  const methodCache = {};

  containersList.push(container);

  const containerProxy = new Proxy(container, {
    get(target, key, receiver) {
      if (typeof key === 'string' && key.match(queryMethodRegex)) {
        methodCache[key] = methodCache[key] || testLib[key].bind(null, container);

        return methodCache[key];
      }

      return Reflect.get(...arguments);
    },
  });

  return {
    container: containerProxy,
    ref,
    update: (newProps) => render({ ...node, props: newProps }, container),
    unmount: () => unmountComponentAtNode(container),
  };
}

export function sleep(time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

export { renderNode as render };
