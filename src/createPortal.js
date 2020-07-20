import render from './render';

/**
 *  Render children outside the main DOM hierarchy of
 *  the parent component without losing the context
 */
function createPortal(child, container) {
  // mark the child node as ported node
  // TODO: Work on portal container logic with fiber
  // child.portalContainer = container;

  render(child, container);

  // We need to return the rendered child node so that life cycles are handled properly on render flow
  return child;
}

export default createPortal;
