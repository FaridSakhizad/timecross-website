/**
 * A grid selection is made of half-hour slots; tests mostly spell it in whole hours. These turn
 * one into the other.
 */
import { GRID_HOUR_MS, GRID_SLOT_MS, GRID_SLOTS_PER_HOUR } from '../../src/components/TimelineGrid/shared/gridSelection.ts';

export { GRID_SLOT_MS as SLOT_MS, GRID_SLOTS_PER_HOUR as PER_HOUR };

/** The halves of every hour in `hours` ({ rowId, start } of whole hours), in order. */
export function slotsOf(hours) {
  return hours.flatMap(({ rowId, start }) => Array.from({ length: GRID_SLOTS_PER_HOUR }, (_, index) => (
    { rowId, start: start + index * GRID_SLOT_MS }
  )));
}

/** The start of the hour a time falls in: the cell that shows it. */
export function hourOf(time) {
  return Math.floor(time / GRID_HOUR_MS) * GRID_HOUR_MS;
}
