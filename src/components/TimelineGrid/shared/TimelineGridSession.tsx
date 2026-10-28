import './style.css';

import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { useLocation, useSearchParams } from 'react-router';
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
import { getSettings } from '../../../settings';
import { useCurrentMinuteDate } from '../../../useCurrentMinuteDate';
import AddCityModal from '../../Cities/AddCityModal';
import {
  createFavoriteCityFromSearchResult,
  getOrderedSelectedCities,
  saveSelectedCities,
  SELECTED_CITIES_CHANGED_EVENT,
} from '../../Cities/selectedCities';
import { useLocalizedCities } from '../../Cities/useLocalizedCities';
import {
  getBrowserTimezone,
  getTimelineCells,
  getTimelineDates,
} from '../../Timelines/utils';
import { getSharedGridTimelineDates, readGridEventUrlState, type SharedGridEvent } from './eventUrlState';
import { readPlannerUrlState, writePlannerUrlState } from '../../Timelines/plannerUrlState';
import type { TimelineGridProps, TimelineGridShellProps } from './types';

const restrictTimelineGridDragToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

type SessionProps = TimelineGridProps & { View: ComponentType<TimelineGridShellProps> };

export default function TimelineGridSession(props: SessionProps) {
  const { pathname, hash } = useLocation();
  const sharedEvent = useMemo(() => readGridEventUrlState(hash), [hash]);
  return <GridSession key={`${pathname}${hash}`} {...props} sharedEvent={sharedEvent} />;
}

function GridSession({
  colorMode,
  timeFormat,
  onColorModeButtonClick,
  onTimeFormatButtonClick,
  sharedEvent,
  presentation = 'zen',
  syncUrl = false,
  View,
}: SessionProps & { sharedEvent: SharedGridEvent | null }) {
  const [, setSearchParams] = useSearchParams();
  const [initialState] = useState(() => readPlannerUrlState(syncUrl ? window.location.search : ''));
  const [anchorDate, setAnchorDate] = useState(initialState.at);
  const [selectedDate, setSelectedDate] = useState(initialState.at);
  const [hasSelection, setHasSelection] = useState(Boolean(initialState.at || initialState.cities));
  const baseDate = useCurrentMinuteDate();
  const browserTimezone = useMemo(() => getBrowserTimezone(), []);
  const [cities, setCities] = useState(() => sharedEvent?.cities ?? initialState.cities ?? getOrderedSelectedCities(getSettings().cityOrder));
  const [selectedHours, setSelectedHours] = useState(sharedEvent?.hours ?? []);
  const [isAddCityModalOpen, setIsAddCityModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const localizedCities = useLocalizedCities(cities);
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
    if (!syncUrl || !hasSelection || sharedEvent) return;
    const params = writePlannerUrlState(new URLSearchParams(window.location.search), cities, selectedDate);
    if (params.toString() !== new URLSearchParams(window.location.search).toString()) {
      setSearchParams(params, { replace: true, preventScrollReset: true });
    }
  }, [cities, hasSelection, selectedDate, setSearchParams, sharedEvent, syncUrl]);

  useEffect(() => {
    if (!syncUrl || sharedEvent) return;
    const restore = () => {
      const state = readPlannerUrlState(window.location.search);
      setCities(state.cities ?? getOrderedSelectedCities(getSettings().cityOrder));
      setAnchorDate(state.at);
      setSelectedDate(state.at);
      setSelectedHours([]);
      setHasSelection(Boolean(state.at || state.cities));
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [sharedEvent, syncUrl]);

  useEffect(() => {
    if (sharedEvent) return;
    const handleSelectedCitiesChange = () => {
      setCities(getOrderedSelectedCities(getSettings().cityOrder));
    };

    window.addEventListener(SELECTED_CITIES_CHANGED_EVENT, handleSelectedCitiesChange);

    return () => {
      window.removeEventListener(SELECTED_CITIES_CHANGED_EVENT, handleSelectedCitiesChange);
    };
  }, [sharedEvent]);

  const timelineDates = useMemo(
    () => sharedEvent ? getSharedGridTimelineDates(sharedEvent) : getTimelineDates(browserTimezone, anchorDate ?? baseDate),
    [anchorDate, baseDate, browserTimezone, sharedEvent],
  );

  const userCells = useMemo(
    () => getTimelineCells(browserTimezone, baseDate, timelineDates, timeFormat),
    [baseDate, browserTimezone, timelineDates, timeFormat],
  );
  const currentUserHourIndex = userCells.findIndex((cell) => cell.isCurrentHour);

  const handleHourChange = useCallback((index: number) => {
    const date = timelineDates[index];
    if (!date) return;
    setSelectedDate(date);
    setHasSelection(true);
  }, [timelineDates]);

  const handleAddCity = (city: Parameters<typeof createFavoriteCityFromSearchResult>[0]) => {
    const nextCities = [
      ...cities,
      createFavoriteCityFromSearchResult(city, cities.length),
    ];

    setCities(nextCities);
    setHasSelection(true);
    if (!sharedEvent) saveSelectedCities(nextCities);
    setIsAddCityModalOpen(false);
  };

  const handleDeleteCity = (cityId: string) => {
    const nextCities = cities.filter((city) => city.id !== cityId);

    if (nextCities.length === cities.length) {
      return;
    }

    setCities(nextCities);
    setHasSelection(true);
    if (!sharedEvent) saveSelectedCities(nextCities);
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
    setHasSelection(true);
    if (!sharedEvent) saveSelectedCities(nextCities);
  };

  const handleDragCancel = () => {
    setIsDragging(false);
  };

  const shellProps = {
    presentation,
    onHourChange: syncUrl && !sharedEvent ? handleHourChange : undefined,
    onReset: syncUrl && !sharedEvent ? () => {
      setAnchorDate(null);
      setSelectedDate(null);
      setHasSelection(true);
    } : undefined,
    baseDate,
    browserTimezone,
    cities: localizedCities,
    colorMode,
    currentUserHourIndex,
    isDragging,
    isEditMode,
    timelineDates,
    timeFormat,
    userCells,
    initialSelectedHours: selectedHours,
    onSelectionChange: setSelectedHours,
    initialFocusHourIndex: sharedEvent
      ? timelineDates.findIndex((date) => date.getTime() === sharedEvent.start)
        + Math.floor((sharedEvent.end - sharedEvent.start) / 7200000)
      : anchorDate ? timelineDates.findIndex((date) => date.getTime() === anchorDate.getTime()) : undefined,
    onAddCityClick: () => setIsAddCityModalOpen(true),
    onColorModeButtonClick,
    onDeleteCity: handleDeleteCity,
    onEditModeToggle: () => setIsEditMode((currentMode) => !currentMode),
    onTimeFormatButtonClick,
  };

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
          <View {...shellProps} />
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
