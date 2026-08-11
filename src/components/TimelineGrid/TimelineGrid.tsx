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
import {
  getBrowserTimezone,
  getTimelineCells,
  getTimelineDates,
} from '../Timelines/utils';
import { useUsesNativeTimelineScroll } from '../Timelines/useTimelineMedia';
import TimelineGridDesktop from './TimelineGridDesktop';
import TimelineGridMobile from './TimelineGridMobile';

type TimelineGridProps = {
  timeFormat: TimeFormat;
};

export default function TimelineGrid({ timeFormat }: TimelineGridProps) {
  const baseDate = useMemo(() => new Date(), []);
  const browserTimezone = useMemo(() => getBrowserTimezone(), []);
  const usesBodyScroll = useUsesNativeTimelineScroll();
  const [cities, setCities] = useState(() => getOrderedSelectedCities(getSettings().cityOrder));
  const [isAddCityModalOpen, setIsAddCityModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
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

  const handleDeleteCity = (cityId: string) => {
    const nextCities = cities.filter((city) => city.id !== cityId);

    if (nextCities.length === cities.length) {
      return;
    }

    setCities(nextCities);
    saveSelectedCities(nextCities);
  };

  const shellProps = {
    baseDate,
    browserTimezone,
    cities,
    currentUserHourIndex,
    isEditMode,
    timelineDates,
    timeFormat,
    userCells,
    onAddCityClick: () => setIsAddCityModalOpen(true),
    onDeleteCity: handleDeleteCity,
    onEditModeToggle: () => setIsEditMode((currentMode) => !currentMode),
  };
  const TimelineGridShell = usesBodyScroll ? TimelineGridMobile : TimelineGridDesktop;

  return (
    <>
      <TimelineGridShell {...shellProps} />

      <AddCityModal
        isOpen={isAddCityModalOpen}
        selectedCityIds={cityIds}
        onClose={() => setIsAddCityModalOpen(false)}
        onSave={handleAddCity}
      />
    </>
  );
}
