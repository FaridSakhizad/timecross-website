import './style.css';
import { useEffect, useMemo, useState } from 'react';
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
import { useCurrentMinuteDate } from '../../useCurrentMinuteDate';
import AddCityModal from '../Cities/AddCityModal';
import {
  createFavoriteCityFromSearchResult,
  getOrderedSelectedCities,
  saveSelectedCities,
  SELECTED_CITIES_CHANGED_EVENT,
} from '../Cities/selectedCities';
import { useLocalizedCities } from '../Cities/useLocalizedCities';
import TimelineRow from './TimelineRow';
import TimelinesDesktop from './TimelinesDesktop';
import TimelinesMobile from './TimelinesMobile';
import { useUsesNativeTimelineScroll } from './useTimelineMedia';
import { getBrowserTimezone, getTimelineCells, getTimelineDates } from './utils';

type TimelinesProps = {
  timeFormat: TimeFormat;
};

const restrictTimelinesDragToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

export default function Timelines({ timeFormat }: TimelinesProps) {
  const baseDate = useCurrentMinuteDate();
  const browserTimezone = useMemo(() => getBrowserTimezone(), []);
  const [cities, setCities] = useState(() => getOrderedSelectedCities(getSettings().cityOrder));
  const [isAddCityModalOpen, setIsAddCityModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const usesNativeScroll = useUsesNativeTimelineScroll();
  const localizedCities = useLocalizedCities(cities);
  const cityIds = useMemo(() => cities.map((city) => city.id), [cities]);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: 6,
      },
      onActivation: ({ event }) => {
        event.preventDefault();
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

  const handleDeleteCity = (cityId: string) => {
    const nextCities = cities.filter((city) => city.id !== cityId);

    if (nextCities.length === cities.length) {
      return;
    }

    setCities(nextCities);
    saveSelectedCities(nextCities);
  };

  const currentUserHourIndex = userCells.findIndex((cell) => cell.isCurrentHour);
  const timelineRows = localizedCities.map((city) => (
    <TimelineRow
      baseDate={baseDate}
      browserTimezone={browserTimezone}
      city={city}
      isEditMode={isEditMode}
      key={city.id}
      timelineDates={timelineDates}
      timeFormat={timeFormat}
      onDelete={handleDeleteCity}
    />
  ));

  const handleAddCity = (city: Parameters<typeof createFavoriteCityFromSearchResult>[0]) => {
    const nextCities = [
      ...cities,
      createFavoriteCityFromSearchResult(city, cities.length),
    ];

    setCities(nextCities);
    saveSelectedCities(nextCities);
    setIsAddCityModalOpen(false);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setIsDragging(false);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = cities.findIndex((city) => city.id === String(active.id));
    const newIndex = cities.findIndex((city) => city.id === String(over.id));

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

  const props = {
    currentUserHourIndex,
    isDragging,
    isEditMode,
    onAddCityClick: () => setIsAddCityModalOpen(true),
    onEditModeToggle: () => setIsEditMode((currentMode) => !currentMode),
    timelineRows,
    userCells,
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictTimelinesDragToVerticalAxis]}
        onDragCancel={() => setIsDragging(false)}
        onDragEnd={handleDragEnd}
        onDragStart={() => setIsDragging(true)}
      >
        <SortableContext items={cityIds} strategy={verticalListSortingStrategy}>
          {usesNativeScroll
            ? <TimelinesMobile {...props} />
            : <TimelinesDesktop {...props} />}
        </SortableContext>
      </DndContext>

      <AddCityModal
        isOpen={isAddCityModalOpen}
        onClose={() => setIsAddCityModalOpen(false)}
        onSave={handleAddCity}
      />
    </>
  );
}
