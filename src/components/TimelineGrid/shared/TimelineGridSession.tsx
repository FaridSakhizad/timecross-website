import './style.css';

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
import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { useLocation, useSearchParams } from 'react-router';

import { useCurrentMinuteDate } from '../../../hooks/useCurrentMinuteDate';
import { usePreferences } from '../../../hooks/usePreferences';
import { useI18n } from '../../../i18n';
import { getIntlLocale } from '../../../i18n/intlLocale';
import { getBrowserTimezone, getUtcDateForZonedTime, getZonedDateParts } from '../../../utils/time';
import AddCityModal from '../../Cities/AddCityModal';
import type { CitySearchRow } from '../../Cities/cityData';
import {
  createFavoriteCityFromSearchResult,
  saveSelectedCities,
  getSelectedCities,
  subscribeSelectedCities,
} from '../../Cities/selectedCities';
import { useLocalizedCities } from '../../Cities/useLocalizedCities';

import { TIMELINE_HOUR_MS } from './constants';
import { getEventParams, getSharedGridTimelineDates, readGridEventUrlState, type SharedGridEvent } from './eventUrlState';
import { moveSlotsByDays } from './gridSelection';
import { readPlannerUrlState, writePlannerUrlState } from './sessionUrlState';
import {
  getTimelineCells,
  getTimelineDates,
} from './timelineCells';
import type { TimelineGridSessionProps, TimelineGridShellProps } from './types';
import { useMeetingParticipants } from './useMeetingParticipants';

const restrictTimelineGridDragToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

type SessionProps = TimelineGridSessionProps & { View: ComponentType<TimelineGridShellProps> };

export default function TimelineGridSession(props: SessionProps) {
  const { pathname, search, hash } = useLocation();
  const eventParams = getEventParams(search, hash);
  const sharedEvent = useMemo(() => readGridEventUrlState(eventParams), [eventParams]);

  return (
    <GridSession
      key={`${pathname}${eventParams}`}
      {...props}
      sharedEvent={sharedEvent}
    />
  );
}

/** Hour to scroll to on open: the middle of a shared event, else the time from the URL. */
function getInitialFocusHourIndex(timelineDates: Date[], sharedEvent: SharedGridEvent | null, anchorDate: Date | null) {
  if (sharedEvent) {
    // The hour in the middle of the meeting, which may start and end at half past.
    const middle = (sharedEvent.start + sharedEvent.end) / 2;

    return timelineDates.findIndex((date) => date.getTime() <= middle && middle < date.getTime() + TIMELINE_HOUR_MS);
  }

  if (anchorDate) {
    return timelineDates.findIndex((date) => date.getTime() === anchorDate.getTime());
  }

  return undefined;
}

function GridSession({
  sharedEvent,
  presentation = 'zen',
  syncUrl = false,
  View,
}: SessionProps & { sharedEvent: SharedGridEvent | null }) {
  const { timeFormat } = usePreferences();
  const [, setSearchParams] = useSearchParams();
  const { language } = useI18n();
  const [initialState] = useState(() => readPlannerUrlState(syncUrl ? window.location.search : ''));
  const [anchorDate, setAnchorDate] = useState(initialState.at);
  const [selectedDate, setSelectedDate] = useState(initialState.at);
  const [hasSelection, setHasSelection] = useState(Boolean(initialState.at || initialState.cities));
  const baseDate = useCurrentMinuteDate();
  const browserTimezone = useMemo(() => getBrowserTimezone(), []);
  const [cities, setCities] = useState(() => sharedEvent?.cities ?? initialState.cities ?? getSelectedCities());
  const [selectedHours, setSelectedHours] = useState(sharedEvent?.hours ?? []);
  const [isAddCityModalOpen, setIsAddCityModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const localizedCities = useLocalizedCities(cities);
  const cityIds = useMemo(() => cities.map((city) => city.id), [cities]);
  const citiesKey = cityIds.join('\n');
  const [selectionCitiesKey, setSelectionCitiesKey] = useState(citiesKey);

  // Another list of cities drops the selection (a new day carries it along, see handleDateSelect).
  // Adjusted while rendering, so the grids get the empty selection with the new cities.
  if (selectionCitiesKey !== citiesKey) {
    setSelectionCitiesKey(citiesKey);
    setSelectedHours([]);
  }

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
    if (!syncUrl || !hasSelection || sharedEvent) {
      return;
    }

    const params = writePlannerUrlState(new URLSearchParams(window.location.search), cities, selectedDate);

    if (params.toString() !== new URLSearchParams(window.location.search).toString()) {
      setSearchParams(params, { replace: true, preventScrollReset: true });
    }
  }, [cities, hasSelection, selectedDate, setSearchParams, sharedEvent, syncUrl]);

  useEffect(() => {
    if (!syncUrl || sharedEvent) {
      return;
    }

    const restore = () => {
      const state = readPlannerUrlState(window.location.search);

      setCities(state.cities ?? getSelectedCities());
      setAnchorDate(state.at);
      setSelectedDate(state.at);
      setSelectedHours([]);
      setHasSelection(Boolean(state.at || state.cities));
    };

    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [sharedEvent, syncUrl]);

  useEffect(() => {
    if (sharedEvent) {
      return;
    }

    return subscribeSelectedCities(() => {
      setCities(getSelectedCities());
    });
  }, [sharedEvent]);

  const timelineDates = useMemo(
    () => (sharedEvent ? getSharedGridTimelineDates(sharedEvent) : getTimelineDates(browserTimezone, anchorDate ?? baseDate)),
    [anchorDate, baseDate, browserTimezone, sharedEvent],
  );

  const userCells = useMemo(
    () => getTimelineCells(browserTimezone, baseDate, timelineDates, timeFormat, getIntlLocale(language)),
    [baseDate, browserTimezone, language, timelineDates, timeFormat],
  );
  const currentUserHourIndex = userCells.findIndex((cell) => cell.isCurrentHour);

  const handleHourChange = useCallback((index: number) => {
    const date = timelineDates[index];

    if (!date) {
      return;
    }

    setSelectedDate(date);
    setHasSelection(true);
  }, [timelineDates]);

  // The hour in the middle of the grid: scrolled to, picked or now.
  const focusedDate = selectedDate ?? anchorDate ?? baseDate;

  /** Another day: the grid moves to it, at the same hour as now in the middle ("2026-11-20"). */
  const handleDateSelect = useCallback((value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
      return;
    }

    const focused = getZonedDateParts(browserTimezone, focusedDate);
    const date = getUtcDateForZonedTime(browserTimezone, {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: focused.hour,
    });
    // The grid's hours start on whole UTC hours, also in zones with a half-hour offset.
    const anchor = new Date(Math.floor(date.getTime() / TIMELINE_HOUR_MS) * TIMELINE_HOUR_MS);
    const days = (Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) - Date.UTC(focused.year, focused.month - 1, focused.day))
      / (24 * TIMELINE_HOUR_MS);

    setAnchorDate(anchor);
    setSelectedDate(anchor);
    setHasSelection(true);
    // The selected hours go along: the same hours on the clock, on the new day.
    setSelectedHours((current) => moveSlotsByDays(current, days, browserTimezone));
  }, [browserTimezone, focusedDate]);

  const handleAddCity = (city: CitySearchRow) => {
    const nextCities = [
      ...cities,
      createFavoriteCityFromSearchResult(city),
    ];

    setCities(nextCities);
    setHasSelection(true);

    if (!sharedEvent) {
      saveSelectedCities(nextCities);
    }

    setIsAddCityModalOpen(false);
  };

  const handleDeleteCity = (cityId: string) => {
    const nextCities = cities.filter((city) => city.id !== cityId);

    if (nextCities.length === cities.length) {
      return;
    }

    setCities(nextCities);
    setHasSelection(true);

    if (!sharedEvent) {
      saveSelectedCities(nextCities);
    }
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

    const nextCities = arrayMove(cities, oldIndex, newIndex);

    setCities(nextCities);
    setHasSelection(true);

    if (!sharedEvent) {
      saveSelectedCities(nextCities);
    }
  };

  const handleDragCancel = () => {
    setIsDragging(false);
  };

  const {
    participantIds: meetingParticipantIds,
    excludedIds: meetingExcludedIds,
    setParticipant: setMeetingParticipant,
  } = useMeetingParticipants(localizedCities, selectedHours);

  const shellProps = {
    presentation,
    onHourChange: sharedEvent ? undefined : handleHourChange,
    // A shared meeting keeps its own day.
    focusedDate,
    onDateSelect: sharedEvent ? undefined : handleDateSelect,
    onReset: sharedEvent
      ? undefined
      : () => {
          setAnchorDate(null);
          setSelectedDate(null);
          setHasSelection(true);
        },
    baseDate,
    browserTimezone,
    cities: localizedCities,
    currentUserHourIndex,
    isDragging,
    isEditMode,
    timelineDates,
    timeFormat,
    userCells,
    initialSelectedHours: selectedHours,
    onSelectionChange: setSelectedHours,
    meetingParticipantIds,
    meetingExcludedIds,
    onMeetingParticipantChange: setMeetingParticipant,
    initialFocusHourIndex: getInitialFocusHourIndex(timelineDates, sharedEvent, anchorDate),
    onAddCityClick: () => setIsAddCityModalOpen(true),
    onDeleteCity: handleDeleteCity,
    onEditModeToggle: () => setIsEditMode((currentMode) => !currentMode),
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
        <SortableContext
          items={cityIds}
          strategy={verticalListSortingStrategy}
        >
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
