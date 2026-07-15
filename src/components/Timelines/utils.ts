import type { CSSProperties } from 'react';
import type { TimeFormat } from '../../settings';
import { TIMELINE_EXTRA_DAY_HOURS, TIMELINE_HOUR_WIDTH, TIMELINE_HOUR_MS, TIMELINE_TOTAL_HOURS } from './constants';
import type { TimelineCell } from './types';

export function getBrowserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getUtcDateForZonedTime(
  timezone: string,
  dateParts: { year: number; month: number; day: number; hour: number; minute?: number; second?: number },
) {
  const utcTime = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    dateParts.hour,
    dateParts.minute ?? 0,
    dateParts.second ?? 0,
  );
  const firstPassDate = new Date(utcTime);
  const firstPassOffset = getTimeZoneOffsetMinutes(timezone, firstPassDate);
  const secondPassDate = new Date(utcTime - firstPassOffset * 60000);
  const secondPassOffset = getTimeZoneOffsetMinutes(timezone, secondPassDate);

  return new Date(utcTime - secondPassOffset * 60000);
}

function formatHour(date: Date, timezone: string, timeFormat: TimeFormat) {
  return new Intl.DateTimeFormat(timeFormat === '24h' ? 'en-GB' : 'en-US', {
    timeZone: timezone,
    hour: timeFormat === '24h' ? '2-digit' : 'numeric',
    hour12: timeFormat === '12h',
    hourCycle: 'h23',
  }).format(date);
}

export function formatTime(date: Date, timezone: string, timeFormat: TimeFormat) {
  return new Intl.DateTimeFormat(timeFormat === '24h' ? 'en-GB' : 'en-US', {
    timeZone: timezone,
    hour: timeFormat === '24h' ? '2-digit' : 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
    hourCycle: 'h23',
  }).format(date);
}

function formatDateCell(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatOffset(offsetMinutes: number) {
  if (offsetMinutes === 0) {
    return 'same';
  }

  const sign = offsetMinutes > 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  return `${sign}${hours}${minutes > 0 ? `:${String(minutes).padStart(2, '0')}` : ''}`;
}

export function getRelativeDayMarker(
  timezone: string,
  baseTimezone: string,
  date: Date,
) {
  const timezoneDateSerial = getDateSerialFromParts(getZonedDateParts(timezone, date));
  const baseTimezoneDateSerial = getDateSerialFromParts(getZonedDateParts(baseTimezone, date));
  const dateSerialDiff = timezoneDateSerial - baseTimezoneDateSerial;

  if (dateSerialDiff === -1) {
    return 'yesterday';
  }

  if (dateSerialDiff === 1) {
    return 'tomorrow';
  }

  return null;
}

export function getZonedDateParts(timezone: string, date: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  ) as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

export function getTimeZoneOffsetMinutes(timezone: string, date: Date) {
  const dateParts = getZonedDateParts(timezone, date);
  const zonedTime = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    dateParts.hour,
    dateParts.minute,
    dateParts.second,
  );

  return Math.round((zonedTime - date.getTime()) / 60000);
}

function getDateSerialFromParts(dateParts: Pick<ReturnType<typeof getZonedDateParts>, 'year' | 'month' | 'day'>) {
  return Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day) / 86400000;
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
  const startHourIndex = getHourIndexForDate(todayStartDate) - TIMELINE_EXTRA_DAY_HOURS;

  return Array.from({ length: TIMELINE_TOTAL_HOURS }, (_, index) => (
    new Date((startHourIndex + index) * TIMELINE_HOUR_MS)
  ));
}

export function getTimelineCells(
  timezone: string,
  baseDate: Date,
  timelineDates: Date[],
  timeFormat: TimeFormat,
) {
  const todaySerial = getDateSerialFromParts(getZonedDateParts(timezone, baseDate));

  return timelineDates.map((date): TimelineCell => {
    const dateTime = date.getTime();
    const dateParts = getZonedDateParts(timezone, date);
    const dateSerial = getDateSerialFromParts(dateParts);
    const isDateLabel = dateParts.hour === 0;

    return {
      date,
      label: isDateLabel ? formatDateCell(date, timezone) : formatHour(date, timezone, timeFormat),
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
