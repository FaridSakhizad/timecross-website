import GridRow, { type GridRowClasses } from '../shared/GridRow';
import GridUserHours from '../shared/GridUserHours';
import type { GridTimelineProps } from '../shared/types';

const ROW_CLASSES: GridRowClasses = {
  cells: 'timelineGrid-cells_desktop',
  spacer: 'timelineGrid-cellsSpacer_desktop',
};

export default function DesktopTimeline({
  baseDate,
  browserTimezone,
  cities,
  isEditMode,
  onDeleteCity,
  selectedSlotKeys,
  selectedHourStarts,
  meetingExcludedIds,
  timeFormat,
  timelineDates,
  userCells,
}: GridTimelineProps) {
  return (
    <>
      <GridUserHours
        userCells={userCells}
        className="timelineGrid-userHours_desktop"
        selectedHourStarts={selectedHourStarts}
      />
      {cities.map((city) => (
        <GridRow
          key={city.id}
          city={city}
          classNames={ROW_CLASSES}
          baseDate={baseDate}
          browserTimezone={browserTimezone}
          isEditMode={isEditMode}
          timelineDates={timelineDates}
          timeFormat={timeFormat}
          selectedSlotKeys={selectedSlotKeys}
          isDimmed={meetingExcludedIds.has(city.id)}
          onDelete={onDeleteCity}
        />
      ))}
    </>
  );
}
