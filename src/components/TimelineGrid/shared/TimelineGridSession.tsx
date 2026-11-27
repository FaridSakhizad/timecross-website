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
import { useLocation, useNavigate, useSearchParams } from 'react-router';

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
import {
  getEventParams,
  getSharedGridTimelineDates,
  readGridEventUrlState,
  removeEventParams,
  type SharedGridEvent,
} from './eventUrlState';
import { moveSlotsByDays, type SelectedGridSlot } from './gridSelection';
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

/** What the grid was opened with: a page, and the meeting of a link, if any. */
type OpenedSession = {
  pathname: string;
  eventParams: string;
  sharedEvent: SharedGridEvent | null;
  /** The meeting was taken into editing: its parameters left the URL, the grid keeps it. */
  isReleased: boolean;
};

function openSession(pathname: string, eventParams: string): OpenedSession {
  return {
    pathname,
    eventParams,
    sharedEvent: readGridEventUrlState(eventParams),
    isReleased: false,
  };
}

export default function TimelineGridSession(props: SessionProps) {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const eventParams = getEventParams(search, hash);
  const [session, setSession] = useState(() => openSession(pathname, eventParams));
  const isSameMeeting = eventParams === session.eventParams || (session.isReleased && !eventParams);

  // Another page or another meeting: the grid starts again. Adjusted while rendering.
  if (pathname !== session.pathname || !isSameMeeting) {
    setSession(openSession(pathname, eventParams));
  }

  // A reload after this shows the planner, not the meeting as it came before the changes.
  const releaseMeeting = useCallback(() => {
    setSession((current) => ({ ...current, isReleased: true }));
    // Within the page: nothing to wait for.
    void navigate(
      {
        search: removeEventParams(search),
        hash: '',
      },
      {
        replace: true,
        preventScrollReset: true,
      },
    );
  }, [navigate, search]);

  return (
    <GridSession
      key={`${session.pathname}${session.eventParams}`}
      {...props}
      sharedEvent={session.sharedEvent}
      onMeetingRelease={releaseMeeting}
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

/**
 * A meeting from a link is first shown as it came ("view"); taken into editing ("edit"), it is a
 * selection like any other, still with the link's cities; cleared, it gives way to the planner.
 */
type LinkMode = 'view' | 'edit' | null;

type GridSessionProps = SessionProps & {
  sharedEvent: SharedGridEvent | null;
  onMeetingRelease: () => void;
};

function GridSession({
  sharedEvent,
  onMeetingRelease,
  presentation = 'zen',
  syncUrl = false,
  View,
}: GridSessionProps) {
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
  const [linkMode, setLinkMode] = useState<LinkMode>(sharedEvent ? 'view' : null);
  // The meeting's own day, until another day is picked.
  const [eventDates, setEventDates] = useState(() => (sharedEvent ? getSharedGridTimelineDates(sharedEvent) : null));
  // The link's cities are not saved as the visitor's.
  const hasLinkCities = linkMode !== null;
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
    if (!syncUrl || !hasSelection || hasLinkCities) {
      return;
    }

    const params = writePlannerUrlState(new URLSearchParams(window.location.search), cities, selectedDate);

    if (params.toString() !== new URLSearchParams(window.location.search).toString()) {
      setSearchParams(params, { replace: true, preventScrollReset: true });
    }
  }, [cities, hasLinkCities, hasSelection, selectedDate, setSearchParams, syncUrl]);

  useEffect(() => {
    if (!syncUrl || hasLinkCities) {
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
  }, [hasLinkCities, syncUrl]);

  useEffect(() => {
    if (hasLinkCities) {
      return;
    }

    return subscribeSelectedCities(() => {
      setCities(getSelectedCities());
    });
  }, [hasLinkCities]);

  const timelineDates = useMemo(
    () => eventDates ?? getTimelineDates(browserTimezone, anchorDate ?? baseDate),
    [anchorDate, baseDate, browserTimezone, eventDates],
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

    setEventDates(null);
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

    if (!hasLinkCities) {
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

    if (!hasLinkCities) {
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

    if (!hasLinkCities) {
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

  const startEditing = () => {
    setLinkMode('edit');
    onMeetingRelease();
  };

  // Cleared, the meeting of a link gives way to the planner, with the visitor's own cities.
  const handleSelectionChange = useCallback((hours: SelectedGridSlot[]) => {
    setSelectedHours(hours);

    if (hours.length || linkMode !== 'edit') {
      return;
    }

    setLinkMode(null);
    setEventDates(null);
    setCities(getSelectedCities());
  }, [linkMode]);

  const isViewingLink = linkMode === 'view';

  const shellProps = {
    presentation,
    onHourChange: isViewingLink ? undefined : handleHourChange,
    // A meeting from a link keeps its own day until it is taken into editing.
    focusedDate,
    onDateSelect: isViewingLink ? undefined : handleDateSelect,
    onReset: isViewingLink
      ? undefined
      : () => {
          setEventDates(null);
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
    onSelectionChange: handleSelectionChange,
    onMeetingEdit: isViewingLink ? startEditing : undefined,
    meetingTitle: sharedEvent?.title,
    meetingParticipantIds,
    meetingExcludedIds,
    onMeetingParticipantChange: setMeetingParticipant,
    initialFocusHourIndex: getInitialFocusHourIndex(timelineDates, eventDates ? sharedEvent : null, anchorDate),
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
