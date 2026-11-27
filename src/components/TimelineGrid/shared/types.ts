import type { TimeFormat } from '../../../settings';
import type { StoredCity } from '../../../settings';

import type { SelectedGridSlot } from './gridSelection';
import type { TimelineCell } from './timelineCells';

export type TimelineGridSessionProps = {
  presentation?: 'zen' | 'embedded';
  syncUrl?: boolean;
};

export type TimelineGridContentProps = {
  presentation?: 'zen' | 'embedded';
  onHourChange?: (index: number) => void;
  onReset?: () => void;
  /** The hour in the middle of the grid; its day is shown on the date button. */
  focusedDate: Date;
  /** Moves the grid to another day ("2026-11-20"); none for a shared meeting, which keeps its day. */
  onDateSelect?: (value: string) => void;
  baseDate: Date;
  browserTimezone: string;
  cities: StoredCity[];
  currentUserHourIndex: number;
  isDragging: boolean;
  isEditMode: boolean;
  timelineDates: Date[];
  timeFormat: TimeFormat;
  userCells: TimelineCell[];
  selectedSlotKeys?: ReadonlySet<string>;
  /** The hours the selection touches, for the user's hours at the top (see getSelectedHourStarts). */
  selectedHourStarts?: ReadonlySet<number>;
  initialSelectedHours?: SelectedGridSlot[];
  onSelectionChange?: (hours: SelectedGridSlot[]) => void;
  /**
   * Set while a meeting from a link is shown as it came: its frame does not move, no other frame is
   * drawn and its card cannot be changed, until this takes it into editing.
   */
  onMeetingEdit?: () => void;
  /** The title the meeting from a link came with: its card starts with it. */
  meetingTitle?: string;
  /** Who the selected meeting is for (see useMeetingParticipants); empty without a selection. */
  meetingParticipantIds: ReadonlySet<string>;
  /** Covered by the selection, but unchecked in its card. */
  meetingExcludedIds: ReadonlySet<string>;
  onMeetingParticipantChange: (cityId: string, included: boolean) => void;
  initialFocusHourIndex?: number;
  onAddCityClick: () => void;
  onDeleteCity: (cityId: string) => void;
  onEditModeToggle: () => void;
  onResetClick: () => void;
};

export type TimelineGridShellProps = Omit<TimelineGridContentProps, 'onResetClick'>;

export type GridTimelineProps = Pick<TimelineGridContentProps, 'baseDate' | 'browserTimezone' | 'cities' | 'isEditMode' | 'timelineDates' | 'timeFormat'
  | 'userCells' | 'selectedSlotKeys' | 'selectedHourStarts' | 'meetingExcludedIds' | 'onDeleteCity'>;

export type GridToolbarProps = Pick<TimelineGridContentProps, 'presentation' | 'isEditMode' | 'onAddCityClick'
  | 'onEditModeToggle' | 'onResetClick' | 'cities'> & {
    selectedHours: SelectedGridSlot[];
  };
