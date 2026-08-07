import './style.css';
import { useEffect, useMemo, useState } from 'react';
import { getSettings, type TimeFormat } from '../../settings';
import {
  getOrderedSelectedCities,
  SELECTED_CITIES_CHANGED_EVENT,
} from '../Cities/selectedCities';
import TimelineRow from './TimelineRow';
import TimelinesDesktop from './TimelinesDesktop';
import TimelinesMobile from './TimelinesMobile';
import { useUsesNativeTimelineScroll } from './useTimelineMedia';
import { getBrowserTimezone, getTimelineCells, getTimelineDates } from './utils';

type TimelinesProps = {
  timeFormat: TimeFormat;
};

export default function Timelines({ timeFormat }: TimelinesProps) {
  const baseDate = useMemo(() => new Date(), []);
  const browserTimezone = useMemo(() => getBrowserTimezone(), []);
  const [cities, setCities] = useState(() => getOrderedSelectedCities(getSettings().cityOrder));
  const usesNativeScroll = useUsesNativeTimelineScroll();

  useEffect(() => {
    const handleSelectedCitiesChange = () => {
      setCities(getOrderedSelectedCities(getSettings().cityOrder));
    };

    window.addEventListener(SELECTED_CITIES_CHANGED_EVENT, handleSelectedCitiesChange);

    return () => {
      window.removeEventListener(SELECTED_CITIES_CHANGED_EVENT, handleSelectedCitiesChange);
    };
  }, []);

  const timelineDates = useMemo(
    () => getTimelineDates(browserTimezone, baseDate),
    [baseDate, browserTimezone],
  );

  const userCells = useMemo(
    () => getTimelineCells(browserTimezone, baseDate, timelineDates, timeFormat),
    [baseDate, browserTimezone, timelineDates, timeFormat],
  );

  const currentUserHourIndex = userCells.findIndex((cell) => cell.isCurrentHour);
  const timelineRows = cities.map((city) => (
    <TimelineRow
      baseDate={baseDate}
      browserTimezone={browserTimezone}
      city={city}
      key={city.id}
      timelineDates={timelineDates}
      timeFormat={timeFormat}
    />
  ));

  const props = {
    currentUserHourIndex,
    timelineRows,
    userCells,
  };

  return usesNativeScroll
    ? <TimelinesMobile {...props} />
    : <TimelinesDesktop {...props} />;
}
