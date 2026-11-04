import type { CSSProperties } from 'react';
import type { TimeFormat } from '../../settings';
import { formatInTimezone, formatPartsInTimezone } from '../../utils/abstractTimezone';
import {
  getDateSerial,
  getDayShift,
  getUtcDateForZonedTime,
  getZonedDateParts,
  type ZonedDateParts,
} from '../../utils/time';
import {
  TIMELINE_EDGE_FADE_HOURS,
  TIMELINE_EXTRA_DAY_HOURS,
  TIMELINE_HOUR_WIDTH,
  TIMELINE_HOUR_MS,
  TIMELINE_RENDERED_HOURS,
} from './constants';
import type { TimelineCell } from './types';

function formatHour(date: Date, timezone: string, timeFormat: TimeFormat) {
  if (timeFormat === '24h') {
    return String(getZonedDateParts(timezone, date).hour);
  }

  return formatInTimezone(date, timezone, 'en-US', {
    hour: 'numeric',
    hour12: true,
  });
}

function formatDayPeriod(date: Date, timezone: string) {
  return formatPartsInTimezone(date, timezone, 'en-US', {
    hour: 'numeric',
    hour12: true,
  }).find((part) => part.type === 'dayPeriod')?.value ?? null;
}

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

function formatCurrentTimelineCellTime(
  dateParts: ZonedDateParts,
  minuteLabel: string,
  periodLabel: string | null,
  timeFormat: TimeFormat,
) {
  if (timeFormat === '24h') {
    return `${String(dateParts.hour).padStart(2, '0')}:${minuteLabel}`;
  }

  const hourLabel = dateParts.hour % 12 || 12;

  return `${hourLabel}:${minuteLabel}${periodLabel ?? ''}`;
}

export function formatTime(date: Date, timezone: string, timeFormat: TimeFormat) {
  return formatInTimezone(date, timezone, timeFormat === '24h' ? 'en-GB' : 'en-US', timeFormat === '24h'
    ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
    : { hour: 'numeric', minute: '2-digit', hourCycle: 'h12' });
}

function formatDateCell(date: Date, timezone: string) {
  return formatInTimezone(date, timezone, 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrentDateCellParts(date: Date, timezone: string) {
  const parts = Object.fromEntries(
    formatPartsInTimezone(date, timezone, 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  ) as { weekday: string; month: string; day: string };

  return {
    weekdayLabel: parts.weekday,
    dateLabel: `${parts.day} ${parts.month.toLowerCase()}`,
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

export function getTimelineCells(
  timezone: string,
  baseDate: Date,
  timelineDates: Date[],
  timeFormat: TimeFormat,
) {
  const todaySerial = getDateSerial(getZonedDateParts(timezone, baseDate));
  const baseDateParts = getZonedDateParts(timezone, baseDate);
  const currentMinuteLabel = String(baseDateParts.minute).padStart(2, '0');
  const currentPeriodLabel = timeFormat === '12h' ? formatDayPeriod(baseDate, timezone) : null;
  const currentTimeLabel = formatCurrentTimelineCellTime(
    baseDateParts,
    currentMinuteLabel,
    currentPeriodLabel,
    timeFormat,
  );

  return timelineDates.map((date): TimelineCell => {
    const dateTime = date.getTime();
    const dateParts = getZonedDateParts(timezone, date);
    const dateSerial = getDateSerial(dateParts);
    const isDateLabel = dateParts.hour === 0;

    return {
      date,
      label: isDateLabel ? formatDateCell(date, timezone) : formatHour(date, timezone, timeFormat),
      period: getTimelineCellPeriod(dateParts.hour),
      dateCellDetails: isDateLabel ? formatCurrentDateCellParts(date, timezone) : null,
      currentTimeLabel,
      minuteLabel: currentMinuteLabel,
      periodLabel: currentPeriodLabel,
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
