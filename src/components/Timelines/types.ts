export type TimelineCell = {
  date: Date;
  label: string;
  period: 'night' | 'morning' | 'day' | 'evening' | 'lateEvening';
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
