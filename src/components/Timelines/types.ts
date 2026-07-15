export type TimelineCell = {
  date: Date;
  label: string;
  isAdjacentDay: boolean;
  isCurrentHour: boolean;
  isDateLabel: boolean;
};

export type TimelineDragState = {
  pointerId: number;
  lastX: number;
  lastY: number;
};
