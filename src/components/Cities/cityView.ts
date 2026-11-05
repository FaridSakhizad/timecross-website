import type { TimeFormat } from '../../settings';
import {
  formatRelativeOffset,
  getClockLabel,
  getDateSerial,
  getDayPeriod,
  getTimeZoneOffsetMinutesFromParts,
  getZonedDateParts,
  type DayPeriod,
  type ZonedDateParts,
} from '../../utils/time';

import type { LocalizedCity } from './useLocalizedCities';

/** A city of the list as shown at the selected moment. */
export type CityView = LocalizedCity & {
  currentTime: string;
  currentPeriod: DayPeriod;
  dayShift: 'yesterday' | 'tomorrow' | null;
  relativeTimeOffset: string;
};

function formatTimeFromDateParts(dateParts: ZonedDateParts, timeFormat: TimeFormat) {
  const { time, period } = getClockLabel(dateParts.hour, dateParts.minute, timeFormat);

  return period ? `${time} ${period}` : time;
}

function getDayShiftLabel(cityDateParts: ZonedDateParts, baseBrowserDateParts: ZonedDateParts) {
  const dayDiff = getDateSerial(cityDateParts) - getDateSerial(baseBrowserDateParts);

  if (dayDiff > 0) {
    return 'tomorrow';
  }

  if (dayDiff < 0) {
    return 'yesterday';
  }

  return null;
}

export function getCityView(
  city: LocalizedCity,
  selectedDate: Date,
  baseBrowserDateParts: ZonedDateParts,
  browserOffsetMinutes: number,
  timeFormat: TimeFormat,
  sameLabel: string,
): CityView {
  const cityDateParts = getZonedDateParts(city.timezone, selectedDate);

  return {
    ...city,
    currentTime: formatTimeFromDateParts(cityDateParts, timeFormat),
    currentPeriod: getDayPeriod(cityDateParts.hour),
    dayShift: getDayShiftLabel(cityDateParts, baseBrowserDateParts),
    relativeTimeOffset: formatRelativeOffset(
      getTimeZoneOffsetMinutesFromParts(cityDateParts, selectedDate) - browserOffsetMinutes,
      sameLabel,
    ),
  };
}
