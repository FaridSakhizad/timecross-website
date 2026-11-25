import {
  getMeetingSeed,
  type GridSelectionCellGeometry,
  type SelectedGridSlot,
  type SelectionRect,
} from '../shared/gridSelection.ts';

/** The "new meeting" selection: every city at the hour in the middle of the visible grid. */
export function getInitialDesktopGridSelection(cells: GridSelectionCellGeometry[], visible: SelectionRect): SelectedGridSlot[] {
  if (visible.right <= visible.left || visible.bottom <= visible.top) {
    return [];
  }

  return getMeetingSeed(cells, (visible.left + visible.right) / 2);
}
