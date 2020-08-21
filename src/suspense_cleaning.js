function cleanManager(fiber) {
  const { nodeInstance } = fiber;
  // if it is a suspense component remove the suspense manager from the parent manager, if its not mounted
  if (nodeInstance && nodeInstance instanceof Suspense && !isMounted(nodeInstance)) {
    loopEntries(nodeInstance.suspenseManagers, (transitionId, manager) => {
      const { parentSuspenseManager } = manager;

      if (parentSuspenseManager) {
        const { childManagers } = parentSuspenseManager;
        childManagers.splice(childManagers.indexOf(manager), 1);
      }
    });
  }
}

/**
 * Recursively loop down and clean all the uncommitted managers from their
 * parent manager, or else we will have memory leak and also suspense list will break
 */
export function cleanUncommittedManagers(fiber) {
  const { root } = fiber;
  let { child } = fiber;

  if (child && child.createdAt > root.lastCompleteTime) {
    while (child) {
      cleanManager(child);

      // recurse on child
      cleanUncommittedManagers(child);

      // check for fiber
      child = child.sibling;
    }
  }
}
