import './style.css';
import { useMemo } from 'react';
import { getSettings, type TimeFormat } from '../../settings';
import CustomScrollbar from '../CustomScrollbar';
import { getOrderedFavoriteCities } from '../Cities/fixtures';
import { useI18n } from '../../i18n';
import { TIMELINE_EDGE_FADE_HOURS, TIMELINE_TOTAL_HOURS } from './constants';
import TimelineHeader from './TimelineHeader';
import TimelineRow from './TimelineRow';
import { useTimelineCarousel } from './useTimelineCarousel';
import { getBrowserTimezone, getTimelineCells, getTimelineDates } from './utils';

type TimelinesProps = {
  timeFormat: TimeFormat;
};

export default function Timelines({ timeFormat }: TimelinesProps) {
  const { t } = useI18n();
  const baseDate = useMemo(() => new Date(), []);
  const browserTimezone = useMemo(() => getBrowserTimezone(), []);
  const cities = useMemo(() => getOrderedFavoriteCities(getSettings().cityOrder), []);
  const timelineDates = useMemo(
    () => getTimelineDates(browserTimezone, baseDate),
    [baseDate, browserTimezone],
  );
  const userCells = useMemo(
    () => getTimelineCells(browserTimezone, baseDate, timelineDates, timeFormat),
    [baseDate, browserTimezone, timelineDates, timeFormat],
  );
  const currentUserHourIndex = userCells.findIndex((cell) => cell.isCurrentHour);
  const { resetScroll, scrollByHours, setViewportRef, widgetRef } = useTimelineCarousel({
    currentHourIndex: currentUserHourIndex,
    minHourIndex: TIMELINE_EDGE_FADE_HOURS,
    maxHourIndex: TIMELINE_EDGE_FADE_HOURS + TIMELINE_TOTAL_HOURS - 1,
  });

  return (
    <>
      <button
        className="timelinesReset"
        type="button"
        onClick={resetScroll}
        aria-label={t('common.reset')}
      />
      <div className="timelinesWidget" ref={widgetRef}>
        <div className="timelinesPanel">
          <div className="timelinesHeaderViewport">
            <TimelineHeader userCells={userCells} />
          </div>
          <CustomScrollbar
            className="timelinesScroller"
            contentClassName="timelinesViewport"
            contentRef={setViewportRef}
            mode="vertical"
          >
            {cities.map((city) => (
              <TimelineRow
                baseDate={baseDate}
                browserTimezone={browserTimezone}
                city={city}
                key={city.id}
                timelineDates={timelineDates}
                timeFormat={timeFormat}
              />
            ))}
          </CustomScrollbar>
          <div className="timelinesMiddleMarker" />
        </div>
        <button
          className="timelinesNav timelinesNav_prev"
          type="button"
          aria-label={t('common.previousHour')}
          title={t('common.previousHour')}
          onClick={() => scrollByHours(-1)}
        />
        <button
          className="timelinesNav timelinesNav_next"
          type="button"
          aria-label={t('common.nextHour')}
          title={t('common.nextHour')}
          onClick={() => scrollByHours(1)}
        />
      </div>
    </>
  );
}
