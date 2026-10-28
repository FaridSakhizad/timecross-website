import { useI18n } from '../../../i18n';
import GridUserHours from '../shared/GridUserHours';
import GridRow, { type GridRowClasses } from '../shared/GridRow';
import type { GridTimelineProps } from '../shared/types';

const ROW_CLASSES: GridRowClasses = {
  cells: 'timelineGrid-cells_desktop',
  spacer: 'timelineGrid-cellsSpacer_desktop',
};

export default function DesktopTimeline(props: GridTimelineProps) {
  const { t } = useI18n();
  return (
    <>
      <GridUserHours userCells={props.userCells} className="timelineGrid-userHours_desktop" />
      {props.cities.map((city) => (
        <GridRow key={city.id} city={city} classNames={ROW_CLASSES}
          baseDate={props.baseDate} browserTimezone={props.browserTimezone} isEditMode={props.isEditMode}
          timelineDates={props.timelineDates} timeFormat={props.timeFormat}
          selectedHourKeys={props.selectedHourKeys} onDelete={props.onDeleteCity} />
      ))}
      <button className="timelineGrid-addTimezoneButton"
        type="button" onClick={props.onAddCityClick}>
        <i className="timelineGrid-addTimezoneButtonIcon" />
        <span className="timelineGrid-addTimezoneButtonText">{t('common.addCity')}</span>
      </button>
      <div className="timelineGridMiddleMarker timelineGridMiddleMarker_desktop" />
      <div className="timelineGridMiddleHoursMarker timelineGridMiddleMarker_desktop" />
    </>
  );
}
