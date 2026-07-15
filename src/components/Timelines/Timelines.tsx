import './style.css';
import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { getSettings, type TimeFormat } from '../../settings';
import CustomScrollbar from '../CustomScrollbar';
import { getOrderedFavoriteCities, type FavoriteCity } from '../Cities/fixtures';

const TIMELINE_HOURS_IN_DAY = 24;
const TIMELINE_EXTRA_DAY_HOURS = 24;
const TIMELINE_HOUR_WIDTH = 110;
const TIMELINE_DRAG_ENABLED = false;

type TimelinesProps = {
  timeFormat: TimeFormat;
};

type TimelineCell = {
  date: Date;
  label: string;
  isAdjacentDay: boolean;
  isCurrentHour: boolean;
};

type TimelineDragState = {
  pointerId: number;
  lastX: number;
  lastY: number;
};

function getBrowserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getTodayStartDate(date: Date) {
  const todayStartDate = new Date(date);

  todayStartDate.setHours(0, 0, 0, 0);

  return todayStartDate;
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

function formatTime(date: Date, timezone: string, timeFormat: TimeFormat) {
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

function formatOffset(offsetMinutes: number) {
  if (offsetMinutes === 0) {
    return 'same';
  }

  const sign = offsetMinutes > 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  return `${sign}${hours}${minutes > 0 ? `:${String(minutes).padStart(2, '0')}` : ''}`;
}

function getZonedDateParts(timezone: string, date: Date) {
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

function getTimeZoneOffsetMinutes(timezone: string, date: Date) {
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

function getTimelineDates(todayStartDate: Date) {
  return Array.from({ length: TIMELINE_HOURS_IN_DAY + TIMELINE_EXTRA_DAY_HOURS * 2 }, (_, index) => {
    const date = new Date(todayStartDate);

    date.setHours(index - TIMELINE_EXTRA_DAY_HOURS);

    return date;
  });
}

function getCityTimelineDates(timezone: string, baseDate: Date) {
  const cityDateParts = getZonedDateParts(timezone, baseDate);
  const cityTodayStartDate = getUtcDateForZonedTime(timezone, {
    year: cityDateParts.year,
    month: cityDateParts.month,
    day: cityDateParts.day,
    hour: 0,
  });

  return getTimelineDates(cityTodayStartDate);
}

function getTimelineCells(timezone: string, baseDate: Date, timelineDates: Date[], timeFormat: TimeFormat) {
  const todaySerial = getDateSerialFromParts(getZonedDateParts(timezone, baseDate));

  return timelineDates.map((date): TimelineCell => {
    const dateTime = date.getTime();
    const dateParts = getZonedDateParts(timezone, date);
    const dateSerial = getDateSerialFromParts(dateParts);

    return {
      date,
      label: dateParts.hour === 0 ? formatDateCell(date, timezone) : formatHour(date, timezone, timeFormat),
      isAdjacentDay: dateSerial !== todaySerial,
      isCurrentHour: dateTime <= baseDate.getTime() && baseDate.getTime() < dateTime + 3600000,
    };
  });
}

function getTimelineCellsStyle(offsetMinutes: number): CSSProperties {
  const offsetPx = (-offsetMinutes / 60) * TIMELINE_HOUR_WIDTH;

  return {
    '--timeline-offset-px': `${offsetPx}px`,
  } as CSSProperties;
}

function TimelineRow({
  city,
  baseDate,
  browserTimezone,
  timeFormat,
}: {
  city: FavoriteCity;
  baseDate: Date;
  browserTimezone: string;
  timeFormat: TimeFormat;
}) {
  const cells = getTimelineCells(city.timezone, baseDate, getCityTimelineDates(city.timezone, baseDate), timeFormat);
  const offsetMinutes = getTimeZoneOffsetMinutes(city.timezone, baseDate)
    - getTimeZoneOffsetMinutes(browserTimezone, baseDate);
  const offset = formatOffset(offsetMinutes);

  return (
    <div className="timelines-row">
      <div className="timelines-city">
        <div className="container timelines-cityContainer">
          <strong className="timelines-cityName">{city.customName || city.city}</strong>
          <span className="timelines-cityOffset">{offset}</span>
          <span className="timelines-cityTime">{formatTime(baseDate, city.timezone, timeFormat)}</span>
        </div>
      </div>
      <div className="timelines-cells" style={getTimelineCellsStyle(offsetMinutes)}>
        {cells.map((cell, index) => (
          <span
            className={[
              'timelines-cell',
              cell.isAdjacentDay ? 'timelines-cell_adjacentDay' : '',
              cell.isCurrentHour ? 'timelines-cell_current' : '',
            ].filter(Boolean).join(' ')}
            key={`${city.id}-${cell.date.toISOString()}-${index}`}
          >
            {cell.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Timelines({ timeFormat }: TimelinesProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const baseDate = useMemo(() => new Date(), []);
  const todayStartDate = useMemo(() => getTodayStartDate(baseDate), [baseDate]);
  const browserTimezone = getBrowserTimezone();
  const cities = useMemo(() => getOrderedFavoriteCities(getSettings().cityOrder), []);
  const timelineDates = useMemo(() => getTimelineDates(todayStartDate), [todayStartDate]);
  const userCells = getTimelineCells(browserTimezone, baseDate, timelineDates, timeFormat);
  const setViewportRef = useCallback((element: HTMLDivElement | null) => {
    viewportRef.current = element;
  }, []);

  useEffect(() => {
    if (!TIMELINE_DRAG_ENABLED) {
      return;
    }

    const viewport = viewportRef.current;
    let drag: TimelineDragState | null = null;

    if (!viewport) {
      return;
    }

    const endDrag = () => {
      if (!drag) {
        return;
      }

      drag = null;
      viewport.classList.remove('timelinesViewport_dragging');
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
      window.removeEventListener('blur', handleWindowBlur);
    };

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      if (event.buttons === 0) {
        endDrag();
        return;
      }

      event.preventDefault();
      viewport.scrollLeft -= event.clientX - drag.lastX;
      viewport.scrollTop -= event.clientY - drag.lastY;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
    };

    const handleWindowPointerUp = (event: globalThis.PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      viewport.scrollLeft -= event.clientX - drag.lastX;
      viewport.scrollTop -= event.clientY - drag.lastY;
      endDrag();
    };

    const handleWindowBlur = () => {
      endDrag();
    };

    const handleViewportPointerDown = (event: globalThis.PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      endDrag();
      drag = {
        pointerId: event.pointerId,
        lastX: event.clientX,
        lastY: event.clientY,
      };
      viewport.classList.add('timelinesViewport_dragging');
      window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
      window.addEventListener('pointerup', handleWindowPointerUp);
      window.addEventListener('pointercancel', handleWindowPointerUp);
      window.addEventListener('blur', handleWindowBlur);
    };

    viewport.addEventListener('pointerdown', handleViewportPointerDown);

    return () => {
      viewport.removeEventListener('pointerdown', handleViewportPointerDown);
      endDrag();
    };
  }, []);

  return (
    <CustomScrollbar
      className="timelinesWidget"
      contentClassName="timelinesViewport"
      contentRef={setViewportRef}
      mode="both"
    >
      <div className="timelines-row timelines-row_header">
        <div className="timelines-city timelines-city_header">
          <div className="container timelines-cityContainer">
            <span>Your Time</span>
            <span className="timelines-cityTime">{formatTime(baseDate, browserTimezone, timeFormat)}</span>
          </div>
        </div>
        <div className="timelines-cells" style={getTimelineCellsStyle(0)}>
          {userCells.map((cell, index) => (
            <span
              className={`timelines-hour ${cell.isCurrentHour ? 'timelines-hour_current' : ''}`}
              key={`user-${cell.date.toISOString()}-${index}`}
            >
              {cell.label}
            </span>
          ))}
        </div>
      </div>
      {cities.map((city) => (
        <TimelineRow
          baseDate={baseDate}
          browserTimezone={browserTimezone}
          city={city}
          key={city.id}
          timeFormat={timeFormat}
        />
      ))}
    </CustomScrollbar>
  );
}
