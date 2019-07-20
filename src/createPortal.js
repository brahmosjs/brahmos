import render from './render';

/**
 *  Render children outside the main DOM hierarchy of
 *  the parent component without losing the context
 */
function createPortal (child, container) {
  render(child, container);
  // We need to return the rendered Brahmos node so that life cycles are handled properly on render flow
  return container.__brahmosNode;
}

export default createPortal;
