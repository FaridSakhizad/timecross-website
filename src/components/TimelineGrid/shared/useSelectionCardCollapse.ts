import { useState } from 'react';

/**
 * Whether the selection card is folded into its icon. It stays as it is while the selection is
 * moved or resized; once the selection is cleared, the next one starts `initiallyCollapsed` again
 * (open on a desktop, folded on a phone, where the card would cover the grid).
 */
export function useSelectionCardCollapse(hasSelection: boolean, initiallyCollapsed = false) {
  const [isCollapsed, setCollapsed] = useState(initiallyCollapsed);

  // Adjusted while rendering, as React suggests for state that follows other state.
  if (!hasSelection && isCollapsed !== initiallyCollapsed) {
    setCollapsed(initiallyCollapsed);
  }

  return [isCollapsed, setCollapsed] as const;
}
