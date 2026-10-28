import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getInitialDesktopGridSelection } from '../src/components/TimelineGrid/desktop/initialGridSelection.ts';

const cells = Array.from({ length: 8 }, (_, row) => Array.from({ length: 12 }, (_, col) => ({
  hour: { rowId: `r${row}`, start: col * 3600000 },
  rect: { left: col * 74, right: col * 74 + 64, top: row * 110 + 40, bottom: row * 110 + 104 },
  rowTop: row * 110, rowBottom: row * 110 + 110,
}))).flat();

test('desktop seed uses three centered hours and visible cities after both axes scroll', () => {
  const selected = getInitialDesktopGridSelection(cells, { left: 222, right: 622, top: 260, bottom: 700 });
  assert.equal(selected.length, 9);
  assert.deepEqual([...new Set(selected.map((cell) => cell.rowId))], ['r3', 'r4', 'r5']);
  assert.deepEqual([...new Set(selected.map((cell) => cell.start))], [4, 5, 6].map((col) => col * 3600000));
});

test('desktop seed shrinks for fewer cities/hours and never selects hidden rows', () => {
  const few = cells.filter((cell) => cell.hour.rowId === 'r0' && cell.hour.start < 2 * 3600000);
  assert.equal(getInitialDesktopGridSelection(few, { left: 0, right: 400, top: 0, bottom: 300 }).length, 2);
  assert.deepEqual(getInitialDesktopGridSelection(cells, { left: 0, right: 400, top: 1000, bottom: 1200 }), []);
  assert.deepEqual(getInitialDesktopGridSelection(cells, { left: 400, right: 0, top: 0, bottom: 300 }), []);
});
