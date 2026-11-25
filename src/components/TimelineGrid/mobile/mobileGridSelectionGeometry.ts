import {
  getHourCellSlots,
  getMeetingSeed,
  type GridSelectionCellGeometry,
  type SelectedGridSlot,
  type SelectionRect,
} from '../shared/gridSelection.ts';

export const MOBILE_SELECTION_HORIZONTAL_PADDING = 3;
export const MOBILE_SELECTION_TOP_PADDING = 0;
export const MOBILE_SELECTION_BOTTOM_PADDING = 16;

/** The "new meeting" selection: every city at the hour in the middle of the screen. */
export function getVisibleMobileGridSelection(viewport?: HTMLDivElement, root: ParentNode = viewport ?? document): SelectedGridSlot[] {
  const visible = getMobileGridVisibleRect(viewport);

  return getMeetingSeed(getMobileGridSelectionCells(root, viewport), (visible.left + visible.right) / 2);
}

export function getMobileGridSelectionCells(root: ParentNode = document, viewport?: HTMLDivElement): GridSelectionCellGeometry[] {
  const x = window.scrollX + (viewport?.scrollLeft ?? 0);
  const y = window.scrollY + (viewport?.scrollTop ?? 0);

  return [...root.querySelectorAll<HTMLElement>('.timelineGrid-row_mobile')].flatMap((row) => {
    const rowRect = row.getBoundingClientRect();

    // An hour's cell in halves: the frame snaps to them.
    return [...row.querySelectorAll<HTMLElement>('[data-grid-selection-row][data-grid-hour-start]')].flatMap((element) => {
      const rect = element.getBoundingClientRect();

      return getHourCellSlots({
        slot: { rowId: element.dataset.gridSelectionRow!, start: Number(element.dataset.gridHourStart) },
        rect: {
          left: rect.left + x,
          right: rect.right + x,
          top: rect.top + y,
          bottom: rect.bottom + y,
        },
        rowTop: rowRect.top + y,
        rowBottom: rowRect.bottom + y,
      });
    });
  });
}

export function getMobileGridVisibleRect(viewport?: HTMLDivElement): SelectionRect {
  const header = (viewport ?? document).querySelector('.timelineGrid-userHours_mobile')?.getBoundingClientRect();

  if (viewport) {
    const rect = viewport.getBoundingClientRect();
    const x = window.scrollX + viewport.scrollLeft;
    const y = window.scrollY + viewport.scrollTop;

    return {
      left: x + Math.max(0, rect.left),
      right: x + Math.min(document.documentElement.clientWidth, rect.right),
      top: y + Math.max(0, rect.top, header?.bottom ?? 0),
      bottom: y + Math.min(window.innerHeight, rect.bottom),
    };
  }

  const top = Math.max(0, header?.bottom ?? 0);

  return {
    left: window.scrollX,
    right: window.scrollX + document.documentElement.clientWidth,
    top: window.scrollY + top,
    bottom: window.scrollY + window.innerHeight,
  };
}
