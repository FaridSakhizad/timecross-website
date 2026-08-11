import './style.css';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
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
const restrictTimelineGridDragToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

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

function useMobileTimelineGridHorizontalScrollLock(enabled: boolean) {
  const lockedScrollXRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let animationFrame = 0;
    lockedScrollXRef.current = window.scrollX;

    const lockScrollX = () => {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;

        if (window.scrollX === lockedScrollXRef.current) {
          return;
        }

        window.scrollTo(lockedScrollXRef.current, window.scrollY);
      });
    };

    window.addEventListener('scroll', lockScrollX, { passive: true });
    window.addEventListener('touchmove', lockScrollX, { passive: true });

    lockScrollX();

    return () => {
      window.removeEventListener('scroll', lockScrollX);
      window.removeEventListener('touchmove', lockScrollX);

      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [enabled]);
}

export default function TimelineGrid({ timeFormat }: TimelineGridProps) {
  const baseDate = useMemo(() => new Date(), []);
  const browserTimezone = useMemo(() => getBrowserTimezone(), []);
  const usesMobileLayout = useUsesMobileTimelineGridLayout();
  const [cities, setCities] = useState(() => getOrderedSelectedCities(getSettings().cityOrder));
  const [isAddCityModalOpen, setIsAddCityModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const cityIds = useMemo(() => cities.map((city) => city.id), [cities]);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 8,
      },
    }),
  );

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

  useMobileTimelineGridHorizontalScrollLock(usesMobileLayout && isEditMode);

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

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setIsDragging(false);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = cities.findIndex((city) => city.id === active.id);
    const newIndex = cities.findIndex((city) => city.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const nextCities = arrayMove(cities, oldIndex, newIndex).map((city, index) => ({
      ...city,
      order: index,
    }));

    setCities(nextCities);
    saveSelectedCities(nextCities);
  };

  const handleDragCancel = () => {
    setIsDragging(false);
  };

  const shellProps = {
    baseDate,
    browserTimezone,
    cities,
    currentUserHourIndex,
    isDragging,
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictTimelineGridDragToVerticalAxis]}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragStart={() => setIsDragging(true)}
      >
        <SortableContext items={cityIds} strategy={verticalListSortingStrategy}>
          <TimelineGridShell {...shellProps} />
        </SortableContext>
      </DndContext>

      <AddCityModal
        isOpen={isAddCityModalOpen}
        selectedCityIds={cityIds}
        onClose={() => setIsAddCityModalOpen(false)}
        onSave={handleAddCity}
      />
    </>
  );
}
