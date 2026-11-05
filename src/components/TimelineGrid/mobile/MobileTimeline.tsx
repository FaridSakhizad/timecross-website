import { useI18n } from '../../../i18n';
import GridRow, { type GridRowClasses } from '../shared/GridRow';
import GridUserHours from '../shared/GridUserHours';
import type { GridTimelineProps } from '../shared/types';

const ROW_CLASSES: GridRowClasses = {
  row: 'timelineGrid-row_mobile',
  city: 'timelineGrid-city_mobile',
  cells: 'timelineGrid-cells_mobile',
  spacer: 'timelineGrid-cellsSpacer_mobile',
};

export default function MobileTimeline({
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
        className="timelineGrid-userHours_mobile"
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
