import {
  getNearestIndex,
  getNearestRowGroupStart,
  type GridSelectionCellGeometry,
  type SelectedGridHour,
  type SelectionRect,
} from '../shared/gridSelection.ts';

export function getInitialDesktopGridSelection(cells: GridSelectionCellGeometry[], visible: SelectionRect): SelectedGridHour[] {
  if (visible.right <= visible.left || visible.bottom <= visible.top) {
    return [];
  }

  const visibleCells = cells.filter(({ rect }) => rect.right > visible.left
    && rect.left < visible.right
    && rect.bottom > visible.top
    && rect.top < visible.bottom);
  const rows = [...new Map(visibleCells.map((cell) => [cell.hour.rowId, cell])).values()];
  const fullRows = rows.filter(({ rect }) => rect.top >= visible.top && rect.bottom <= visible.bottom);
  const candidates = (fullRows.length >= 3 ? fullRows : rows).sort((a, b) => a.rowTop - b.rowTop);
  const count = Math.min(3, candidates.length);

  if (!count) {
    return [];
  }

  const firstRow = getNearestRowGroupStart(candidates, count, (visible.top + visible.bottom) / 2);
  const selectedRows = candidates.slice(firstRow, firstRow + count);
  const [firstSelectedRow] = selectedRows;

  if (!firstSelectedRow) {
    return [];
  }

  const columns = cells.filter((cell) => cell.hour.rowId === firstSelectedRow.hour.rowId)
    .sort((a, b) => a.hour.start - b.hour.start);
  const center = getNearestIndex(
    columns.map(({ rect }) => (rect.left + rect.right) / 2),
    (visible.left + visible.right) / 2,
  );
  const firstColumn = Math.max(0, Math.min(columns.length - 3, center - 1));
  const starts = new Set(columns.slice(firstColumn, firstColumn + 3).map((cell) => cell.hour.start));
  const rowIds = new Set(selectedRows.map((cell) => cell.hour.rowId));

  return cells.filter((cell) => rowIds.has(cell.hour.rowId) && starts.has(cell.hour.start)).map((cell) => cell.hour);
}
