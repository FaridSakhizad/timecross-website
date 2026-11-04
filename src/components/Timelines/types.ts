export type TimelineCell = {
  date: Date;
  /** Hour digits ("9", "21") or, at midnight, the date ("Nov 3"). */
  label: string;
  /** AM/PM of an hour cell in 12-hour format, otherwise null. */
  labelPeriod: 'AM' | 'PM' | null;
  period: 'night' | 'morning' | 'day' | 'evening' | 'lateEvening';
  dateCellDetails: {
    weekdayLabel: string;
    dateLabel: string;
  } | null;
  /** Current time without AM/PM: "09:05" or "9:05". */
  currentTimeLabel: string;
  minuteLabel: string;
  /** AM/PM of the current time in 12-hour format, otherwise null. */
  periodLabel: 'AM' | 'PM' | null;
  isAdjacentDay: boolean;
  isCurrentHour: boolean;
  isDateLabel: boolean;
};
