import './style.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
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
import { readPlannerUrlState, writePlannerUrlState } from './plannerUrlState';

type TimelinesProps = {
  timeFormat: TimeFormat;
  syncUrl?: boolean;
};

const restrictTimelinesDragToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

export default function Timelines({ timeFormat, syncUrl = false }: TimelinesProps) {
  const baseDate = useCurrentMinuteDate();
  const [, setSearchParams] = useSearchParams();
  const [initialState] = useState(() => readPlannerUrlState(syncUrl ? window.location.search : ''));
  const [anchorDate, setAnchorDate] = useState(initialState.at);
  const [selectedDate, setSelectedDate] = useState(initialState.at);
  const [hasSelection, setHasSelection] = useState(Boolean(initialState.at || initialState.cities));
  const browserTimezone = useMemo(() => getBrowserTimezone(), []);
  const [cities, setCities] = useState(() => initialState.cities ?? getOrderedSelectedCities(getSettings().cityOrder));
  const [isAddCityModalOpen, setIsAddCityModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const usesNativeScroll = useUsesNativeTimelineScroll(syncUrl);
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
    if (!syncUrl || !hasSelection) return;
    const params = writePlannerUrlState(new URLSearchParams(window.location.search), cities, selectedDate);
    if (params.toString() !== new URLSearchParams(window.location.search).toString()) {
      setSearchParams(params, { replace: true, preventScrollReset: true });
    }
  }, [cities, hasSelection, selectedDate, setSearchParams, syncUrl]);

  useEffect(() => {
    if (!syncUrl) return;
    const restore = () => {
      const state = readPlannerUrlState(window.location.search);
      setCities(state.cities ?? getOrderedSelectedCities(getSettings().cityOrder));
      setAnchorDate(state.at);
      setSelectedDate(state.at);
      setHasSelection(Boolean(state.at || state.cities));
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [syncUrl]);

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
    () => getTimelineDates(browserTimezone, anchorDate ?? baseDate),
    [anchorDate, baseDate, browserTimezone],
  );

  const userCells = useMemo(
    () => getTimelineCells(browserTimezone, baseDate, timelineDates, timeFormat),
    [baseDate, browserTimezone, timelineDates, timeFormat],
  );

  const handleHourChange = useCallback((index: number) => {
    const date = userCells[index]?.date;
    if (date) {
      setSelectedDate(date);
      setHasSelection(true);
    }
  }, [userCells]);

  const handleDeleteCity = (cityId: string) => {
    const nextCities = cities.filter((city) => city.id !== cityId);

    if (nextCities.length === cities.length) {
      return;
    }

    setCities(nextCities);
    setHasSelection(true);
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
    setHasSelection(true);
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
    setHasSelection(true);
    saveSelectedCities(nextCities);
  };

  const props = {
    initialHourIndex: selectedDate
      ? userCells.findIndex((cell) => cell.date.getTime() === selectedDate.getTime())
      : undefined,
    onHourChange: syncUrl ? handleHourChange : undefined,
    onReset: syncUrl ? () => {
      setSelectedDate(null);
      setAnchorDate(null);
      setHasSelection(true);
    } : undefined,
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
            ? <TimelinesMobile key={anchorDate?.toISOString() ?? 'live'} {...props} />
            : <TimelinesDesktop key={anchorDate?.toISOString() ?? 'live'} {...props} />}
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
