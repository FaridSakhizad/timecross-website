import type { TimeFormat } from '../../settings';
import type { FavoriteCity } from '../Cities/fixtures';
import type { TimelineCell } from '../Timelines/types';

export type TimelineGridMode = 'desktop' | 'mobile';

export type TimelineGridContentProps = {
  baseDate: Date;
  browserTimezone: string;
  cities: FavoriteCity[];
  currentUserHourIndex: number;
  isEditMode: boolean;
  mode: TimelineGridMode;
  timelineDates: Date[];
  timeFormat: TimeFormat;
  userCells: TimelineCell[];
  onAddCityClick: () => void;
  onDeleteCity: (cityId: string) => void;
  onEditModeToggle: () => void;
  onResetClick: () => void;
};

export type TimelineGridShellProps = Omit<TimelineGridContentProps, 'mode' | 'onResetClick'>;
