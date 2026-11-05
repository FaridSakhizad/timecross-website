import type { TimeFormat } from '../../../settings';
import type { StoredCity } from '../../../settings';

import type { GridCalendarEvent, SelectedGridHour } from './gridSelection';
import type { TimelineCell } from './timelineCells';

export type TimelineGridSessionProps = {
  presentation?: 'zen' | 'embedded';
  syncUrl?: boolean;
};

export type TimelineGridContentProps = {
  presentation?: 'zen' | 'embedded';
  onHourChange?: (index: number) => void;
  onReset?: () => void;
  baseDate: Date;
  browserTimezone: string;
  cities: StoredCity[];
  currentUserHourIndex: number;
  isDragging: boolean;
  isEditMode: boolean;
  timelineDates: Date[];
  timeFormat: TimeFormat;
  userCells: TimelineCell[];
  selectedHourKeys?: ReadonlySet<string>;
  initialSelectedHours?: SelectedGridHour[];
  onSelectionChange?: (hours: SelectedGridHour[]) => void;
  initialFocusHourIndex?: number;
  onAddCityClick: () => void;
  onDeleteCity: (cityId: string) => void;
  onEditModeToggle: () => void;
  onResetClick: () => void;
};

export type TimelineGridShellProps = Omit<TimelineGridContentProps, 'onResetClick'>;

export type GridTimelineProps = Pick<TimelineGridContentProps, 'baseDate' | 'browserTimezone' | 'cities' | 'isEditMode' | 'timelineDates' | 'timeFormat'
  | 'userCells' | 'selectedHourKeys' | 'onAddCityClick' | 'onDeleteCity'>;

export type GridToolbarProps = Pick<TimelineGridContentProps, 'presentation' | 'isEditMode' | 'onAddCityClick'
  | 'onEditModeToggle' | 'onResetClick' | 'cities'> & {
    calendarEvent: GridCalendarEvent | null;
    selectedHours: SelectedGridHour[];
  };
