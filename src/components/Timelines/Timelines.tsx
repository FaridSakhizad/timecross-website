import './style.css';
import { useEffect, useMemo, useState } from 'react';
import { getSettings, type TimeFormat } from '../../settings';
import AddCityModal from '../Cities/AddCityModal';
import {
  createFavoriteCityFromSearchResult,
  getOrderedSelectedCities,
  saveSelectedCities,
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
  const [isAddCityModalOpen, setIsAddCityModalOpen] = useState(false);
  const usesNativeScroll = useUsesNativeTimelineScroll();
  const cityIds = useMemo(() => cities.map((city) => city.id), [cities]);

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

  const handleAddCity = (city: Parameters<typeof createFavoriteCityFromSearchResult>[0]) => {
    if (cities.some((currentCity) => currentCity.id === String(city.id))) {
      setIsAddCityModalOpen(false);
      return;
    }

    const nextCities = [
      ...cities,
      createFavoriteCityFromSearchResult(city, cities.length),
    ];

    setCities(nextCities);
    saveSelectedCities(nextCities);
    setIsAddCityModalOpen(false);
  };

  const props = {
    currentUserHourIndex,
    onAddCityClick: () => setIsAddCityModalOpen(true),
    timelineRows,
    userCells,
  };

  return (
    <>
      {usesNativeScroll
        ? <TimelinesMobile {...props} />
        : <TimelinesDesktop {...props} />}

      <AddCityModal
        isOpen={isAddCityModalOpen}
        selectedCityIds={cityIds}
        onClose={() => setIsAddCityModalOpen(false)}
        onSave={handleAddCity}
      />
    </>
  );
}
