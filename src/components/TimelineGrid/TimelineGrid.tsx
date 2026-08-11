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
import TimelineGridDesktop from './TimelineGridDesktop';
import TimelineGridMobile from './TimelineGridMobile';

const MOBILE_TIMELINE_GRID_QUERY = '(width < 720px)';

type TimelineGridProps = {
  timeFormat: TimeFormat;
};

function getUsesMobileTimelineGridLayout() {
  return typeof window !== 'undefined'
    && window.matchMedia(MOBILE_TIMELINE_GRID_QUERY).matches;
}

function useUsesMobileTimelineGridLayout() {
  const [usesMobileLayout, setUsesMobileLayout] = useState(getUsesMobileTimelineGridLayout);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_TIMELINE_GRID_QUERY);
    const updateUsesMobileLayout = () => setUsesMobileLayout(mediaQuery.matches);

    updateUsesMobileLayout();
    mediaQuery.addEventListener('change', updateUsesMobileLayout);

    return () => {
      mediaQuery.removeEventListener('change', updateUsesMobileLayout);
    };
  }, []);

  return usesMobileLayout;
}

export default function TimelineGrid({ timeFormat }: TimelineGridProps) {
  const baseDate = useMemo(() => new Date(), []);
  const browserTimezone = useMemo(() => getBrowserTimezone(), []);
  const usesMobileLayout = useUsesMobileTimelineGridLayout();
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
  const TimelineGridShell = usesMobileLayout ? TimelineGridMobile : TimelineGridDesktop;

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
