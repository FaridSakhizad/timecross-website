import type { CSSProperties } from 'react';
import type { TimeFormat } from '../../settings';
import {
  formatClockTime,
  formatShortDate,
  formatShortMonth,
  formatShortWeekday,
  getClockLabel,
  getDateSerial,
  getDayShift,
  getUtcDateForZonedTime,
  getZonedDateParts,
} from '../../utils/time';
import {
  TIMELINE_EDGE_FADE_HOURS,
  TIMELINE_EXTRA_DAY_HOURS,
  TIMELINE_HOUR_WIDTH,
  TIMELINE_HOUR_MS,
  TIMELINE_RENDERED_HOURS,
} from './constants';
import type { TimelineCell } from './types';

function getTimelineCellPeriod(hour: number): TimelineCell['period'] {
  if (hour <= 5) {
    return 'night';
  }

  if (hour <= 8) {
    return 'morning';
  }

  if (hour <= 17) {
    return 'day';
  }

  if (hour <= 20) {
    return 'evening';
  }

  return 'lateEvening';
}

/** "09:05" or "9:05 AM" in the given timezone. */
export function formatTime(date: Date, timezone: string, timeFormat: TimeFormat) {
  return formatClockTime(date, timezone, timeFormat);
}

function formatCurrentDateCellParts(date: Date, timezone: string, locale: string) {
  return {
    weekdayLabel: formatShortWeekday(date, timezone, locale),
    dateLabel: `${getZonedDateParts(timezone, date).day} ${formatShortMonth(date, timezone, locale).toLocaleLowerCase(locale)}`,
  };
}

export function getRelativeDayMarker(
  timezone: string,
  baseTimezone: string,
  date: Date,
) {
  const dayShift = getDayShift(timezone, baseTimezone, date);

  if (dayShift < 0) {
    return 'yesterday';
  }

  if (dayShift > 0) {
    return 'tomorrow';
  }

  return null;
}

function getHourIndexForDate(date: Date) {
  return Math.floor(date.getTime() / TIMELINE_HOUR_MS);
}

export function getTimelineDates(timezone: string, baseDate: Date) {
  const dateParts = getZonedDateParts(timezone, baseDate);
  const todayStartDate = getUtcDateForZonedTime(timezone, {
    year: dateParts.year,
    month: dateParts.month,
    day: dateParts.day,
    hour: 0,
  });
  const startHourIndex = getHourIndexForDate(todayStartDate)
    - TIMELINE_EXTRA_DAY_HOURS
    - TIMELINE_EDGE_FADE_HOURS;

  return Array.from({ length: TIMELINE_RENDERED_HOURS }, (_, index) => (
    new Date((startHourIndex + index) * TIMELINE_HOUR_MS)
  ));
}

/**
 * @param locale Intl locale for month and weekday names (see i18n/intlLocale).
 */
export function getTimelineCells(
  timezone: string,
  baseDate: Date,
  timelineDates: Date[],
  timeFormat: TimeFormat,
  locale: string,
) {
  const baseDateParts = getZonedDateParts(timezone, baseDate);
  const todaySerial = getDateSerial(baseDateParts);
  const currentTime = getClockLabel(baseDateParts.hour, baseDateParts.minute, timeFormat);
  const currentMinuteLabel = String(baseDateParts.minute).padStart(2, '0');

  return timelineDates.map((date): TimelineCell => {
    const dateTime = date.getTime();
    const dateParts = getZonedDateParts(timezone, date);
    const dateSerial = getDateSerial(dateParts);
    const isDateLabel = dateParts.hour === 0;
    const hourLabel = getClockLabel(dateParts.hour, null, timeFormat);

    return {
      date,
      label: isDateLabel ? formatShortDate(date, timezone, locale) : hourLabel.time,
      labelPeriod: isDateLabel ? null : hourLabel.period,
      period: getTimelineCellPeriod(dateParts.hour),
      dateCellDetails: isDateLabel ? formatCurrentDateCellParts(date, timezone, locale) : null,
      currentTimeLabel: currentTime.time,
      minuteLabel: currentMinuteLabel,
      periodLabel: currentTime.period,
      isAdjacentDay: dateSerial !== todaySerial,
      isCurrentHour: dateTime <= baseDate.getTime() && baseDate.getTime() < dateTime + 3600000,
      isDateLabel,
    };
  });
}

export function getTimelineTimezoneShiftMinutes(timezone: string, baseTimezone: string, date: Date) {
  const timezoneDateParts = getZonedDateParts(timezone, date);
  const baseTimezoneDateParts = getZonedDateParts(baseTimezone, date);

  return timezoneDateParts.minute - baseTimezoneDateParts.minute;
}

export function getTimelineCellsStyle(offsetMinutes: number): CSSProperties {
  const offsetPx = -(offsetMinutes / 60) * TIMELINE_HOUR_WIDTH;

  return {
    '--timeline-offset-px': `${offsetPx}px`,
  } as CSSProperties;
}
