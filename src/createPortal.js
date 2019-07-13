import render from './render';

/**
 *  React children outside the main DOM hierarchy of
 *  the parent component without losing the context
 */
function createPortal (child, container) {
  render(child, container);
  // We need to return Node so that it will have lifecycle
  return container.__brahmosNode;
}

export default createPortal;
