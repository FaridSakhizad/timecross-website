import type { GridSelectionCellGeometry, SelectedGridHour, SelectionRect } from '../desktop/gridSelection.ts';

export const MOBILE_SELECTION_INITIAL_HOURS = 3;
export const MOBILE_SELECTION_INITIAL_CITIES = 3;
export const MOBILE_SELECTION_HORIZONTAL_PADDING = 6;
export const MOBILE_SELECTION_TOP_PADDING = -5;
export const MOBILE_SELECTION_BOTTOM_PADDING = 0;

export function getInitialMobileGridSelection(
  cells: GridSelectionCellGeometry[], visible: SelectionRect, targetX: number, targetY: number,
): SelectedGridHour[] {
  const visibleCells = cells.filter((cell) => cell.rect.right > visible.left && cell.rect.left < visible.right
    && cell.rect.bottom > visible.top && cell.rect.top < visible.bottom);
  const rows = [...new Map(visibleCells.map((cell) => [cell.hour.rowId, cell])).values()];
  // Prefer rows whose hour blocks are fully on screen; do not reach into hidden cities to fill the quota.
  const fullRows = rows.filter((cell) => cell.rect.top >= visible.top && cell.rect.bottom <= visible.bottom);
  const candidates = (fullRows.length >= MOBILE_SELECTION_INITIAL_CITIES ? fullRows : rows)
    .sort((a, b) => a.rowTop - b.rowTop);
  const count = Math.min(MOBILE_SELECTION_INITIAL_CITIES, candidates.length);
  let firstRow = 0;
  let nearestDistance = Infinity;
  for (let index = 0; count && index <= candidates.length - count; index++) {
    const center = (candidates[index].rowTop + candidates[index + count - 1].rowBottom) / 2;
    const distance = Math.abs(center - targetY);
    // Equal distances favor the lower group, including when the center falls between two cities.
    if (distance <= nearestDistance) { firstRow = index; nearestDistance = distance; }
  }
  const selectedRows = candidates.slice(firstRow, firstRow + count);
  if (!selectedRows.length) return [];
  const rowIds = new Set(selectedRows.map((cell) => cell.hour.rowId));
  const columns = cells.filter((cell) => cell.hour.rowId === selectedRows[0].hour.rowId)
    .sort((a, b) => a.hour.start - b.hour.start);
  const center = columns.reduce((best, cell, index) => Math.abs((cell.rect.left + cell.rect.right) / 2 - targetX)
    < Math.abs((columns[best].rect.left + columns[best].rect.right) / 2 - targetX) ? index : best, 0);
  const first = Math.max(0, Math.min(columns.length - MOBILE_SELECTION_INITIAL_HOURS, center - 1));
  const starts = new Set(columns.slice(first, first + MOBILE_SELECTION_INITIAL_HOURS).map((cell) => cell.hour.start));
  return cells.filter((cell) => rowIds.has(cell.hour.rowId) && starts.has(cell.hour.start)).map((cell) => cell.hour);
}

export function getMobileGridSelectionCells(root: ParentNode = document): GridSelectionCellGeometry[] {
  return [...root.querySelectorAll<HTMLElement>('.timelineGrid-row_mobile')].flatMap((row) => {
    const rowRect = row.getBoundingClientRect();
    return [...row.querySelectorAll<HTMLElement>('[data-grid-selection-row][data-grid-hour-start]')].map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        hour: { rowId: element.dataset.gridSelectionRow!, start: Number(element.dataset.gridHourStart) },
        rect: { left: rect.left + window.scrollX, right: rect.right + window.scrollX,
          top: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY },
        rowTop: rowRect.top + window.scrollY, rowBottom: rowRect.bottom + window.scrollY,
      };
    });
  });
}

export function getMobileGridVisibleRect(): SelectionRect {
  const header = document.querySelector('.timelineGrid-userHours_mobile')?.getBoundingClientRect();
  const top = Math.max(0, header?.bottom ?? 0);
  return { left: window.scrollX, right: window.scrollX + document.documentElement.clientWidth,
    top: window.scrollY + top, bottom: window.scrollY + window.innerHeight };
}
