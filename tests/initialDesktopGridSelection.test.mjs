import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getInitialDesktopGridSelection } from '../src/components/TimelineGrid/desktop/initialGridSelection.ts';
import { getHourCellSlots, getMeetingSeed, MEETING_SEED_HOURS } from '../src/components/TimelineGrid/shared/gridSelection.ts';

import { hourOf, PER_HOUR } from './support/gridSlots.mjs';

const hour = 3600000;
const cells = Array.from({ length: 8 }, (_, row) => Array.from({ length: 12 }, (_, col) => ({
  slot: { rowId: `r${row}`, start: col * hour },
  rect: { left: col * 74, right: col * 74 + 64, top: row * 110 + 40, bottom: row * 110 + 104 },
  rowTop: row * 110,
  rowBottom: row * 110 + 110,
}))).flat().flatMap((cell) => getHourCellSlots(cell));
const rowsOf = (hours) => [...new Set(hours.map((cell) => cell.rowId))];
/** The hours a selection touches. */
const startsOf = (hours) => [...new Set(hours.map((cell) => hourOf(cell.start)))];

test('a new meeting is one hour for every city, at the hour in the middle of the screen', () => {
  const selected = getMeetingSeed(cells, 400);

  assert.equal(MEETING_SEED_HOURS, 1);
  assert.deepEqual(rowsOf(selected), ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7']);
  assert.deepEqual(startsOf(selected), [5 * hour]);
  // The whole hour: both its halves in every row.
  assert.equal(selected.length, 8 * PER_HOUR);
});

test('the meeting stays inside the timeline at its edges, and there is none without cells', () => {
  assert.deepEqual(startsOf(getMeetingSeed(cells, -500)), [0]);
  assert.deepEqual(startsOf(getMeetingSeed(cells, 5000)), [11 * hour]);
  assert.deepEqual(getMeetingSeed([], 400), []);
});

test('desktop: the meeting is centered on the visible part of the grid, including cities scrolled out of view', () => {
  const selected = getInitialDesktopGridSelection(cells, { left: 222, right: 622, top: 260, bottom: 700 });

  assert.deepEqual(startsOf(selected), [5 * hour]);
  assert.equal(rowsOf(selected).length, 8);
  assert.deepEqual(getInitialDesktopGridSelection(cells, { left: 400, right: 0, top: 0, bottom: 300 }), []);
});
