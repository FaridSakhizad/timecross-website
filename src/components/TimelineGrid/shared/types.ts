import type { ColorMode, TimeFormat } from '../../../settings';
import type { FavoriteCity } from '../../Cities/fixtures';
import type { TimelineCell } from '../../Timelines/types';
import type { GridCalendarEvent, SelectedGridHour } from './gridSelection';

export type TimelineGridProps = {
  presentation?: 'zen' | 'embedded';
  syncUrl?: boolean;
  colorMode: ColorMode;
  timeFormat: TimeFormat;
  onColorModeButtonClick: () => void;
  onTimeFormatButtonClick: () => void;
};

export type TimelineGridContentProps = {
  presentation?: 'zen' | 'embedded';
  onHourChange?: (index: number) => void;
  onReset?: () => void;
  baseDate: Date;
  browserTimezone: string;
  cities: FavoriteCity[];
  colorMode: ColorMode;
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
  onColorModeButtonClick: () => void;
  onDeleteCity: (cityId: string) => void;
  onEditModeToggle: () => void;
  onTimeFormatButtonClick: () => void;
  onResetClick: () => void;
};

export type TimelineGridShellProps = Omit<TimelineGridContentProps, 'onResetClick'>;

export type GridTimelineProps = Pick<TimelineGridContentProps,
  'baseDate' | 'browserTimezone' | 'cities' | 'isEditMode' | 'timelineDates' | 'timeFormat' |
  'userCells' | 'selectedHourKeys' | 'onAddCityClick' | 'onDeleteCity'>;

export type GridToolbarProps = Pick<TimelineGridContentProps,
  'presentation' | 'colorMode' | 'timeFormat' | 'isEditMode' | 'onAddCityClick' |
  'onEditModeToggle' | 'onResetClick' | 'onColorModeButtonClick' | 'onTimeFormatButtonClick' | 'cities'> & {
  calendarEvent: GridCalendarEvent | null;
  selectedHours: SelectedGridHour[];
};
