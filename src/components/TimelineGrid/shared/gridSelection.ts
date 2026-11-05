import { getTimeZoneOffsetMinutesFromParts, getZonedDateParts } from '../../../utils/time.ts';

export type SelectedGridHour = { rowId: string; start: number };

export type SelectionRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type GridSelectionCellGeometry = {
  hour: SelectedGridHour;
  rect: SelectionRect;
  rowTop: number;
  rowBottom: number;
};

export type GridResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
export const GRID_HOUR_MS = 3600000;

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

/**
 * Start index of the `count` consecutive rows whose middle is nearest to `targetY`. On a tie the
 * lower group wins, also when the target falls between two rows.
 */
export function getNearestRowGroupStart(rows: GridSelectionCellGeometry[], count: number, targetY: number) {
  let groupStart = 0;
  let nearestDistance = Infinity;

  for (let index = 0; count > 0 && index + count <= rows.length; index += 1) {
    const first = rows[index];
    const last = rows[index + count - 1];

    if (first && last) {
      const distance = Math.abs((first.rowTop + last.rowBottom) / 2 - targetY);

      if (distance <= nearestDistance) {
        groupStart = index;
        nearestDistance = distance;
      }
    }
  }

  return groupStart;
}

/** Distance between the first two sorted grid positions; 1 when there are fewer than two. */
export function getGridStep(positions: number[]) {
  const [first, second] = positions;

  return first === undefined || second === undefined ? 1 : second - first;
}

/** Set key of an hour. The start goes first: a number has no ":", so no row id can make two keys equal. */
export const gridHourKey = (hour: SelectedGridHour) => `${hour.start}:${hour.rowId}`;

export function getGridSelectionBounds(cells: GridSelectionCellGeometry[], hours: SelectedGridHour[]): SelectionRect | null {
  const keys = new Set(hours.map(gridHourKey));
  const selected = cells.filter((cell) => keys.has(gridHourKey(cell.hour)));

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
  initial: SelectedGridHour[],
  direction: GridResizeDirection,
  x: number,
  y: number,
) {
  const bounds = getGridSelectionBounds(cells, initial);

  if (!bounds) {
    return [];
  }

  const columns = [...new Map(cells.map((cell) => [cell.hour.start, cell.rect])).entries()].sort((a, b) => a[0] - b[0]);
  const rows = [...new Map(cells.map((cell) => [cell.hour.rowId, { top: cell.rowTop, bottom: cell.rowBottom }])).entries()]
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

  return cells.filter((cell) => rowIds.has(cell.hour.rowId)
    && cell.hour.start >= firstStart
    && cell.hour.start <= lastStart).map((cell) => cell.hour);
}

// Live frame edges are continuous; resizeGridSelection remains the whole-cell preview/commit.
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

export function getGridHourRanges(hours: SelectedGridHour[]) {
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
        previous.end += GRID_HOUR_MS;
      } else {
        ranges.push({ rowId, start, end: start + GRID_HOUR_MS });
      }
    }

    return ranges;
  });
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
  hours: SelectedGridHour[],
  cities: {
    id: string;
    name: string;
    timezone: string;
  }[],
  browserTimezone: string,
  title: string,
) {
  const validIds = new Set(cities.map((city) => city.id));
  const ranges = getGridHourRanges(hours.filter((hour) => validIds.has(hour.rowId)));

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
