const FLOATING_MENU_GAP = 8;
const FLOATING_MENU_VIEWPORT_GUTTER = 12;

interface FloatingMenuPosition {
  top: number;
  right: number;
}

/**
 * Computes a viewport-safe top/right position for a floating menu.
 * Opens below the anchor when possible, otherwise flips above.
 */
export function resolveFloatingMenuPosition(
  anchorRect: DOMRect,
  menuHeight: number
): FloatingMenuPosition {
  const right = Math.max(FLOATING_MENU_VIEWPORT_GUTTER, window.innerWidth - anchorRect.right);
  const spaceBelow = window.innerHeight - anchorRect.bottom - FLOATING_MENU_VIEWPORT_GUTTER;

  if (spaceBelow >= menuHeight + FLOATING_MENU_GAP) {
    return {
      top: anchorRect.bottom + FLOATING_MENU_GAP,
      right,
    };
  }

  return {
    top: Math.max(
      FLOATING_MENU_VIEWPORT_GUTTER,
      anchorRect.top - menuHeight - FLOATING_MENU_GAP
    ),
    right,
  };
}
