import { FEATURES } from '../../../config.ts';
import { getTimeZoneOffsetMinutesFromParts, getUtcDateForZonedTime, getZonedDateParts } from '../../../utils/time.ts';

/**
 * Half an hour in a city's row. A selection is made of them, so a meeting can start and end at
 * :30 (a new frame is drawn in whole hours, its sides then move by halves); an hour's cell shows
 * as selected when either of its halves is.
 */
export type SelectedGridSlot = { rowId: string; start: number };

export type SelectionRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type GridSelectionCellGeometry = {
  slot: SelectedGridSlot;
  rect: SelectionRect;
  rowTop: number;
  rowBottom: number;
};

export type GridResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

const ALL_HANDLES: readonly GridResizeDirection[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

/**
 * The frame's handles. A frame for the time only spans every city (who the meeting is for is
 * checked in its card), so only its sides move (see FEATURES.timeOnlyFrame).
 */
export const GRID_FRAME_HANDLES: readonly GridResizeDirection[] = FEATURES.timeOnlyFrame ? ['w', 'e'] : ALL_HANDLES;

/**
 * A frame for the time only takes in the user's own hours too: the row of hours at the top of the
 * grid, above the cities. That row is the grid content's first, so such a frame starts at the top
 * of the content (in content coordinates, 0) and is drawn above the row, which stays at the top
 * while the cities scroll under it.
 */
export const GRID_FRAME_COVERS_USER_HOURS = FEATURES.timeOnlyFrame;
export const GRID_HOUR_MS = 3600000;
/** The selection's step: half an hour. */
export const GRID_SLOT_MS = 1800000;
export const GRID_SLOTS_PER_HOUR = GRID_HOUR_MS / GRID_SLOT_MS;

/** Step of an arrow key along one axis: -1 for `backKey`, 1 for `forwardKey`, otherwise 0. */
export function getArrowKeyStep(key: string, backKey: string, forwardKey: string) {
  if (key === backKey) {
    return -1;
  }

  if (key === forwardKey) {
    return 1;
  }

  return 0;
}

/** A corner handle moved with an arrow key resizes only along the axis of that key. */
export function getKeyboardResizeAxis(direction: GridResizeDirection, isHorizontalMove: boolean): GridResizeDirection {
  if (isHorizontalMove) {
    return direction.includes('w') ? 'w' : 'e';
  }

  return direction.includes('n') ? 'n' : 's';
}

type EdgeScrollOptions = {
  edge: number;
  maxSpeed: number;
  slowdown: number;
};

/** Auto-scroll speed while dragging near a viewport edge: negative near `min`, positive near `max`. */
export function getEdgeScrollSpeed(value: number, min: number, max: number, { edge, maxSpeed, slowdown }: EdgeScrollOptions) {
  if (value < min + edge) {
    return -Math.min(maxSpeed, (min + edge - value) / slowdown);
  }

  if (value > max - edge) {
    return Math.min(maxSpeed, (value - max + edge) / slowdown);
  }

  return 0;
}

/** Index of the value nearest to `target`, the first one on a tie; 0 for an empty list. */
export function getNearestIndex(values: number[], target: number) {
  let nearestIndex = 0;
  let nearestDistance = Infinity;

  values.forEach((value, index) => {
    const distance = Math.abs(value - target);

    if (distance < nearestDistance) {
      nearestIndex = index;
      nearestDistance = distance;
    }
  });

  return nearestIndex;
}

/** How long a new meeting is: one hour, stretched with the frame's side handles. */
export const MEETING_SEED_HOURS = 1;

/**
 * The halves of an hour's cell, each half its width: what a frame snaps to. The cell's
 * other fields (its element, say) are kept.
 */
export function getHourCellSlots<Cell extends GridSelectionCellGeometry>(cell: Cell): Cell[] {
  const width = (cell.rect.right - cell.rect.left) / GRID_SLOTS_PER_HOUR;

  return Array.from({ length: GRID_SLOTS_PER_HOUR }, (_, index) => ({
    ...cell,
    slot: { rowId: cell.slot.rowId, start: cell.slot.start + index * GRID_SLOT_MS },
    rect: {
      ...cell.rect,
      left: cell.rect.left + index * width,
      right: index === GRID_SLOTS_PER_HOUR - 1 ? cell.rect.right : cell.rect.left + (index + 1) * width,
    },
  }));
}

/**
 * A newly drawn frame takes whole hours: every slot of each hour that `touched` reaches, in the
 * order of `cells`. Only moving the frame's sides afterwards picks half hours.
 */
export function getWholeHourSlots(cells: GridSelectionCellGeometry[], touched: SelectedGridSlot[]) {
  const hourKey = (slot: SelectedGridSlot) => gridSlotKey({ rowId: slot.rowId, start: Math.floor(slot.start / GRID_HOUR_MS) * GRID_HOUR_MS });
  const hours = new Set(touched.map(hourKey));

  return cells.filter((cell) => hours.has(hourKey(cell.slot))).map((cell) => cell.slot);
}

/**
 * How far a frame stands out of its selection at each side: by `padding`, into the gap between the
 * cells, at a whole hour; not at all at half past, where the side is on the middle of the cell.
 * While a side is dragged (`moving`), it follows the pointer without any.
 */
export function getFrameSidePadding(hours: SelectedGridSlot[], padding: number, moving?: GridResizeDirection) {
  const span = getMeetingSpan(hours);
  const at = (time: number | undefined) => (time === undefined || time % GRID_HOUR_MS === 0 ? padding : 0);

  return {
    left: moving?.includes('w') ? 0 : at(span?.start),
    right: moving?.includes('e') ? 0 : at(span?.end),
  };
}

/**
 * A selection moved to another day at the same hours on the clock in `timezone`: 13:00–15:00 on
 * Wednesday becomes 13:00–15:00 on Friday, also across a change of daylight saving time.
 */
export function moveSlotsByDays(slots: SelectedGridSlot[], days: number, timezone: string): SelectedGridSlot[] {
  return slots.map(({ rowId, start }) => {
    const { year, month, day, hour, minute } = getZonedDateParts(timezone, new Date(start));
    const target = new Date(Date.UTC(year, month - 1, day + days));

    return {
      rowId,
      start: getUtcDateForZonedTime(timezone, {
        year: target.getUTCFullYear(),
        month: target.getUTCMonth() + 1,
        day: target.getUTCDate(),
        hour,
        minute,
      }).getTime(),
    };
  });
}

/** The hours a selection touches, in any city: the user's hours above them show as selected. */
export function getSelectedHourStarts(hours: SelectedGridSlot[]): ReadonlySet<number> {
  return new Set(hours.map((hour) => Math.floor(hour.start / GRID_HOUR_MS) * GRID_HOUR_MS));
}

/** Whether an hour's cell shows as selected: either of its halves is. */
export function isGridHourSelected(slotKeys: ReadonlySet<string>, rowId: string, hourStart: number) {
  return Array.from({ length: GRID_SLOTS_PER_HOUR }, (_, index) => hourStart + index * GRID_SLOT_MS)
    .some((start) => slotKeys.has(gridSlotKey({ rowId, start })));
}

/**
 * A new meeting: every city, at the hour nearest to `targetX` (the middle of the screen). A meeting
 * is for everyone in the list; cities are left out by moving the top or bottom edge of the frame.
 */
export function getMeetingSeed(cells: GridSelectionCellGeometry[], targetX: number): SelectedGridSlot[] {
  const [firstCell] = cells;

  if (!firstCell) {
    return [];
  }

  const columns = cells
    .filter((cell) => cell.slot.rowId === firstCell.slot.rowId)
    .sort((a, b) => a.slot.start - b.slot.start);
  const center = getNearestIndex(columns.map(({ rect }) => (rect.left + rect.right) / 2), targetX);
  // A whole hour: from the first half of the hour in the middle.
  const length = MEETING_SEED_HOURS * GRID_SLOTS_PER_HOUR;
  const first = Math.max(0, Math.min(columns.length - length, center - (center % GRID_SLOTS_PER_HOUR)));
  const starts = new Set(columns.slice(first, first + length).map((cell) => cell.slot.start));

  return cells.filter((cell) => starts.has(cell.slot.start)).map((cell) => cell.slot);
}

/** Distance between the first two sorted grid positions; 1 when there are fewer than two. */
export function getGridStep(positions: number[]) {
  const [first, second] = positions;

  return first === undefined || second === undefined ? 1 : second - first;
}

/** Set key of an hour. The start goes first: a number has no ":", so no row id can make two keys equal. */
export const gridSlotKey = (hour: SelectedGridSlot) => `${hour.start}:${hour.rowId}`;

export function getGridSelectionBounds(cells: GridSelectionCellGeometry[], hours: SelectedGridSlot[]): SelectionRect | null {
  const keys = new Set(hours.map(gridSlotKey));
  const selected = cells.filter((cell) => keys.has(gridSlotKey(cell.slot)));

  if (!selected.length) {
    return null;
  }

  return {
    left: Math.min(...selected.map((cell) => cell.rect.left)),
    right: Math.max(...selected.map((cell) => cell.rect.right)),
    top: Math.min(...selected.map((cell) => cell.rowTop)),
    bottom: Math.max(...selected.map((cell) => cell.rowBottom)),
  };
}

export function resizeGridSelection(
  cells: GridSelectionCellGeometry[],
  initial: SelectedGridSlot[],
  direction: GridResizeDirection,
  x: number,
  y: number,
) {
  const bounds = getGridSelectionBounds(cells, initial);

  if (!bounds) {
    return [];
  }

  const columns = [...new Map(cells.map((cell) => [cell.slot.start, cell.rect])).entries()].sort((a, b) => a[0] - b[0]);
  const rows = [...new Map(cells.map((cell) => [cell.slot.rowId, { top: cell.rowTop, bottom: cell.rowBottom }])).entries()]
    .sort((a, b) => a[1].top - b[1].top);

  const nearest = getNearestIndex;

  let left = nearest(columns.map(([, rect]) => rect.left), bounds.left);
  let right = nearest(columns.map(([, rect]) => rect.right), bounds.right);
  let top = nearest(rows.map(([, rect]) => rect.top), bounds.top);
  let bottom = nearest(rows.map(([, rect]) => rect.bottom), bounds.bottom);

  if (direction.includes('w')) {
    left = Math.min(right, nearest(columns.map(([, rect]) => rect.left), x));
  }

  if (direction.includes('e')) {
    right = Math.max(left, nearest(columns.map(([, rect]) => rect.right), x));
  }

  if (direction.includes('n')) {
    top = Math.min(bottom, nearest(rows.map(([, rect]) => rect.top), y));
  }

  if (direction.includes('s')) {
    bottom = Math.max(top, nearest(rows.map(([, rect]) => rect.bottom), y));
  }

  const rowIds = new Set(rows.slice(top, bottom + 1).map(([rowId]) => rowId));
  const firstStart = columns[left]?.[0];
  const lastStart = columns[right]?.[0];

  if (firstStart === undefined || lastStart === undefined) {
    return [];
  }

  return cells.filter((cell) => rowIds.has(cell.slot.rowId)
    && cell.slot.start >= firstStart
    && cell.slot.start <= lastStart).map((cell) => cell.slot);
}

// Live frame edges are continuous; resizeGridSelection remains the whole-slot preview/commit.
export function resizeGridSelectionRect(
  initial: SelectionRect,
  limits: SelectionRect,
  direction: GridResizeDirection,
  x: number,
  y: number,
): SelectionRect {
  const rect = { ...initial };

  if (direction.includes('w')) {
    rect.left = Math.max(limits.left, Math.min(initial.right - 1, x));
  }

  if (direction.includes('e')) {
    rect.right = Math.min(limits.right, Math.max(initial.left + 1, x));
  }

  if (direction.includes('n')) {
    rect.top = Math.max(limits.top, Math.min(initial.bottom - 1, y));
  }

  if (direction.includes('s')) {
    rect.bottom = Math.min(limits.bottom, Math.max(initial.top + 1, y));
  }

  return rect;
}

export function intersectsSelection(a: SelectionRect, b: SelectionRect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function getGridSlotRanges(hours: SelectedGridSlot[]) {
  const rows = new Map<string, number[]>();

  for (const hour of hours) {
    if (!Number.isFinite(hour.start)) {
      continue;
    }

    const starts = rows.get(hour.rowId) ?? [];

    starts.push(hour.start);
    rows.set(hour.rowId, starts);
  }

  return [...rows].flatMap(([rowId, starts]) => {
    const ranges: {
      rowId: string;
      start: number;
      end: number;
    }[] = [];

    for (const start of [...new Set(starts)].sort((a, b) => a - b)) {
      const previous = ranges.at(-1);

      if (previous?.end === start) {
        previous.end += GRID_SLOT_MS;
      } else {
        ranges.push({ rowId, start, end: start + GRID_SLOT_MS });
      }
    }

    return ranges;
  });
}

/** From the selection's first hour to the end of its last; null without a selection. */
export function getMeetingSpan(hours: SelectedGridSlot[]) {
  const ranges = getGridSlotRanges(hours);

  if (!ranges.length) {
    return null;
  }

  return {
    start: Math.min(...ranges.map((range) => range.start)),
    end: Math.max(...ranges.map((range) => range.end)),
  };
}

/**
 * The meeting's hours: the selection's span in the row of every participant, whether or not the
 * selection covers that row.
 */
export function getMeetingSlots(hours: SelectedGridSlot[], participantIds: ReadonlySet<string>): SelectedGridSlot[] {
  const span = getMeetingSpan(hours);

  if (!span) {
    return [];
  }

  const starts = Array.from({ length: (span.end - span.start) / GRID_SLOT_MS }, (_, index) => span.start + index * GRID_SLOT_MS);

  return [...participantIds].flatMap((rowId) => starts.map((start) => ({ rowId, start })));
}

/** Machine format for calendar files and links: "2026-11-03", "21:05", "UTC+05:30". */
function formatZonedDateTime(time: number, timezone: string) {
  const date = new Date(time);
  const parts = getZonedDateParts(timezone, date);
  const offsetMinutes = getTimeZoneOffsetMinutesFromParts(parts, date);
  const absolute = Math.abs(offsetMinutes);
  const pad2 = (value: number) => String(value).padStart(2, '0');
  const offset = `UTC${offsetMinutes < 0 ? '-' : '+'}${pad2(Math.floor(absolute / 60))}:${pad2(absolute % 60)}`;

  return {
    date: `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`,
    time: `${pad2(parts.hour)}:${pad2(parts.minute)}`,
    offset,
  };
}

export function buildGridCalendarEvent(
  hours: SelectedGridSlot[],
  cities: {
    id: string;
    name: string;
    timezone: string;
  }[],
  browserTimezone: string,
  title: string,
) {
  const validIds = new Set(cities.map((city) => city.id));
  const ranges = getGridSlotRanges(hours.filter((hour) => validIds.has(hour.rowId)));

  if (!ranges.length) {
    return null;
  }

  const start = Math.min(...ranges.map((range) => range.start));
  const end = Math.max(...ranges.map((range) => range.end));
  const details = cities.flatMap((city) => ranges.filter((range) => range.rowId === city.id).map((range) => {
    const from = formatZonedDateTime(range.start, city.timezone);
    const to = formatZonedDateTime(range.end, city.timezone);

    // Dates and zone IDs disambiguate midnight crossings and repeated DST hours.
    return `${city.name} ${from.time} -> ${to.time} (${from.date}${from.date !== to.date ? ` -> ${to.date}` : ''}; ${city.timezone}; ${from.offset}${from.offset !== to.offset ? ` -> ${to.offset}` : ''})`;
  })).join('\n');
  const utcStamp = (time: number) => new Date(time).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const url = new URL('https://calendar.google.com/calendar/r/eventedit');

  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', title);
  url.searchParams.set('dates', `${utcStamp(start)}/${utcStamp(end)}`);
  url.searchParams.set('stz', browserTimezone);
  url.searchParams.set('etz', browserTimezone);
  url.searchParams.set('details', details);
  return { url: url.href, start, end, details, title };
}

export type GridCalendarEvent = NonNullable<ReturnType<typeof buildGridCalendarEvent>>;

export function buildOutlookCalendarUrl(event: Pick<GridCalendarEvent, 'start' | 'end' | 'title' | 'details'>): string {
  const url = new URL('https://outlook.live.com/calendar/0/deeplink/compose');

  url.searchParams.set('path', '/calendar/action/compose');
  url.searchParams.set('rru', 'addevent');
  url.searchParams.set('allday', 'false');
  url.searchParams.set('subject', event.title);
  url.searchParams.set('startdt', new Date(event.start).toISOString());
  url.searchParams.set('enddt', new Date(event.end).toISOString());
  url.searchParams.set('body', event.details);

  return url.href;
}
