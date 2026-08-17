export type TimelineCell = {
  date: Date;
  label: string;
  dateCellDetails: {
    weekdayLabel: string;
    dateLabel: string;
  } | null;
  currentTimeLabel: string;
  minuteLabel: string;
  periodLabel: string | null;
  isAdjacentDay: boolean;
  isCurrentHour: boolean;
  isDateLabel: boolean;
};
