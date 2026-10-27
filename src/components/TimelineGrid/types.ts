import type { ColorMode, TimeFormat } from '../../settings';
import type { FavoriteCity } from '../Cities/fixtures';
import type { TimelineCell } from '../Timelines/types';
import type { SelectedGridHour } from './desktop/gridSelection';
import type { ReactNode } from 'react';

export type TimelineGridMode = 'desktop' | 'mobile';

export type TimelineGridContentProps = {
  baseDate: Date;
  browserTimezone: string;
  cities: FavoriteCity[];
  colorMode: ColorMode;
  currentUserHourIndex: number;
  isDragging: boolean;
  isEditMode: boolean;
  mode: TimelineGridMode;
  timelineDates: Date[];
  timeFormat: TimeFormat;
  userCells: TimelineCell[];
  selectedHourKeys?: ReadonlySet<string>;
  initialSelectedHours?: SelectedGridHour[];
  onSelectionChange?: (hours: SelectedGridHour[]) => void;
  initialFocusHourIndex?: number;
  afterResetControl?: ReactNode;
  onAddCityClick: () => void;
  onColorModeButtonClick: () => void;
  onDeleteCity: (cityId: string) => void;
  onEditModeToggle: () => void;
  onTimeFormatButtonClick: () => void;
  onResetClick: () => void;
};

export type TimelineGridShellProps = Omit<TimelineGridContentProps, 'mode' | 'onResetClick'>;
