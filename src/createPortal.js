/**
 *  Render children outside the main DOM hierarchy of
 *  the parent component without losing the context
 */
function createPortal(child, container) {
  // add portal container information in child
  // which we can use for forming the part
  if (child) child.portalContainer = container;

  return child;
}

export default createPortal;
