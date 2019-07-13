import render from './render';

/**
 *  React children outside the main DOM hierarchy of
 *  the parent component without losing the context
 */
function createPortal (child, container) {
  render(child, container);
  // Dosn't need anything to return as  just rendering child to another root element
}

export default createPortal;
