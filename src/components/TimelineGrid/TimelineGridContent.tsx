import { Link } from 'react-router';

import { useI18n } from '../../i18n';
import TimelineGridRow from './TimelineGridRow';
import type { TimelineGridContentProps } from './types';

type TimelineGridToolbarProps = Pick<
  TimelineGridContentProps,
  'isEditMode' | 'mode' | 'onAddCityClick' | 'onEditModeToggle' | 'onResetClick'
>;

export function TimelineGridToolbar({
  isEditMode,
  mode,
  onAddCityClick,
  onEditModeToggle,
  onResetClick,
}: TimelineGridToolbarProps) {
  const { t } = useI18n();
  const modeClassName = mode === 'mobile' ? 'timelineGrid-toolbar_mobile' : 'timelineGrid-toolbar_desktop';

  return (
    <div className={`timelineGrid-toolbar ${modeClassName}`}>
      <Link
        to="/"
        className="citiesHeaderButton citiesHeaderButton_home"
        aria-label={t('common.home')}
      >
        <i className="citiesHeaderButton-icon citiesHeaderButton-icon_home" />
      </Link>
      <button
        className={`citiesHeaderButton citiesHeaderButton_edit ${isEditMode ? 'isActive' : ''}`}
        type="button"
        aria-label="edit"
        aria-pressed={isEditMode}
        onClick={onEditModeToggle}
      >
        <i className="citiesHeaderButton-icon citiesHeaderButton-icon_edit" />
      </button>
      <button
        className="citiesHeaderButton citiesHeaderButton_add"
        type="button"
        aria-label={t('common.addCity')}
        onClick={onAddCityClick}
      >
        <i className="citiesHeaderButton-icon citiesHeaderButton-icon_add" />
      </button>
      <button
        className="citiesHeaderButton citiesHeaderButton_reset"
        type="button"
        aria-label={t('common.reset')}
        onClick={onResetClick}
      >
        <i className="citiesHeaderButton-icon citiesHeaderButton-icon_reset" />
      </button>
      <Link
        to="/cities"
        className="citiesHeaderButton citiesHeaderButton_cities"
        aria-label={t('common.openCities')}
      >
        <i className="citiesHeaderButton-icon citiesHeaderButton-icon_cities" />
      </Link>
    </div>
  );
}

export function TimelineGridTimeline({
  baseDate,
  browserTimezone,
  cities,
  isEditMode,
  mode,
  timelineDates,
  timeFormat,
  userCells,
  onDeleteCity,
}: Omit<TimelineGridContentProps, 'isDragging' | 'onAddCityClick' | 'onEditModeToggle' | 'onResetClick'>) {
  const userHoursModeClassName = mode === 'mobile'
    ? 'timelineGrid-userHours_mobile'
    : 'timelineGrid-userHours_desktop';

  const middleMarkerModeClassName = mode === 'mobile'
    ? 'timelineGridMiddleMarker_mobile'
    : 'timelineGridMiddleMarker_desktop';

  return (
    <>
      <div className={`timelineGrid-userHours ${userHoursModeClassName}`}>
        {userCells.map((cell, index) => (
          <span
            className={[
              'timelineGrid-hour',
              cell.isCurrentHour ? 'timelineGrid-hour_current' : '',
              cell.isDateLabel ? 'timelineGrid-hour_date' : '',
            ].filter(Boolean).join(' ')}
            key={`user-${cell.date.toISOString()}-${index}`}
          >
            {cell.label}
          </span>
        ))}
      </div>

      {cities.map((city) => (
        <TimelineGridRow
          baseDate={baseDate}
          browserTimezone={browserTimezone}
          city={city}
          isEditMode={isEditMode}
          key={city.id}
          mode={mode}
          timelineDates={timelineDates}
          timeFormat={timeFormat}
          onDelete={onDeleteCity}
        />
      ))}

      <div className={`timelineGridMiddleMarker ${middleMarkerModeClassName}`} />
      <div className={`timelineGridMiddleHoursMarker ${middleMarkerModeClassName}`} />
    </>
  );
}

export default function TimelineGridContent(props: TimelineGridContentProps) {
  return (
    <>
      {props.mode === 'mobile' && (
        <>
          <div className="timelineGridPageBackdrop timelineGridPageBackdrop_mobile" aria-hidden="true" />
          <div className="timelineGridHeaderBackdrop timelineGridHeaderBackdrop_mobile" aria-hidden="true" />
        </>
      )}
      <TimelineGridToolbar
        isEditMode={props.isEditMode}
        mode={props.mode}
        onAddCityClick={props.onAddCityClick}
        onEditModeToggle={props.onEditModeToggle}
        onResetClick={props.onResetClick}
      />
      <TimelineGridTimeline
        baseDate={props.baseDate}
        browserTimezone={props.browserTimezone}
        cities={props.cities}
        currentUserHourIndex={props.currentUserHourIndex}
        isEditMode={props.isEditMode}
        mode={props.mode}
        timelineDates={props.timelineDates}
        timeFormat={props.timeFormat}
        userCells={props.userCells}
        onDeleteCity={props.onDeleteCity}
      />
    </>
  );
}
