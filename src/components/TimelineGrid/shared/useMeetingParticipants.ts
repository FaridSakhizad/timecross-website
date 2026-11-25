import { useCallback, useMemo, useState } from 'react';

import type { StoredCity } from '../../../settings';

import type { SelectedGridSlot } from './gridSelection';

const NONE: ReadonlySet<string> = new Set();

type MeetingParticipants = {
  participantIds: ReadonlySet<string>;
  /** Covered by the selection but unchecked: their rows step back in the grid. */
  excludedIds: ReadonlySet<string>;
};

/**
 * Who the selected meeting is for: the cities whose rows the selection covers, but those unchecked
 * in the selection card. What is unchecked stays while the selection is moved or resized and goes
 * with it. Both sets are empty without a selection.
 */
export function useMeetingParticipants(cities: StoredCity[], hours: SelectedGridSlot[]) {
  const [unchecked, setUnchecked] = useState(NONE);

  // Adjusted while rendering, as React suggests for state that follows other state.
  if (!hours.length && unchecked.size) {
    setUnchecked(NONE);
  }

  const { participantIds, excludedIds } = useMemo<MeetingParticipants>(() => {
    const coveredIds = new Set(hours.map((hour) => hour.rowId));
    const covered = cities.filter((city) => coveredIds.has(city.id)).map((city) => city.id);

    return {
      participantIds: new Set(covered.filter((id) => !unchecked.has(id))),
      excludedIds: new Set(covered.filter((id) => unchecked.has(id))),
    };
  }, [cities, hours, unchecked]);

  const setParticipant = useCallback((cityId: string, included: boolean) => {
    setUnchecked((current) => {
      const next = new Set(current);

      if (included) {
        next.delete(cityId);
      } else {
        next.add(cityId);
      }

      return next;
    });
  }, []);

  return { participantIds, excludedIds, setParticipant };
}
