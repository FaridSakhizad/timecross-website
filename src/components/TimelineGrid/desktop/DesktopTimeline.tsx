import { useI18n } from '../../../i18n';
import GridUserHours from '../shared/GridUserHours';
import GridRow, { type GridRowClasses } from '../shared/GridRow';
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
  onAddCityClick,
  onDeleteCity,
  selectedHourKeys,
  timeFormat,
  timelineDates,
  userCells,
}: GridTimelineProps) {
  const { t } = useI18n();

  return (
    <>
      <GridUserHours
        userCells={userCells}
        className="timelineGrid-userHours_desktop"
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
          selectedHourKeys={selectedHourKeys}
          onDelete={onDeleteCity}
        />
      ))}
      <div className="timelineGrid-addTimezoneButtonBox">
        <button
          className="timelineGrid-addTimezoneButton"
          type="button"
          onClick={onAddCityClick}
        >
          <i className="timelineGrid-addTimezoneButtonIcon" />
          <span className="timelineGrid-addTimezoneButtonText">{t('common.addCity')}</span>
        </button>
      </div>
    </>
  );
}
