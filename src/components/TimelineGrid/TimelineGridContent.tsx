import { useState } from 'react';
import { useI18n } from '../../i18n';
import StandaloneMenuModal from '../StandaloneMenuModal';
import TimelineCellLabel from '../Timelines/TimelineCellLabel';
import TimelineGridRow from './TimelineGridRow';
import type { TimelineGridContentProps } from './types';

const DAY_PERIOD_SUFFIX_PATTERN = /\s(?:AM|PM)$/;

type TimelineGridToolbarProps = Pick<
  TimelineGridContentProps,
  | 'colorMode'
  | 'isEditMode'
  | 'mode'
  | 'timeFormat'
  | 'onAddCityClick'
  | 'onColorModeButtonClick'
  | 'onEditModeToggle'
  | 'onResetClick'
  | 'onTimeFormatButtonClick'
>;

type TimelineGridTimelineProps = Pick<
  TimelineGridContentProps,
  | 'baseDate'
  | 'browserTimezone'
  | 'cities'
  | 'currentUserHourIndex'
  | 'isEditMode'
  | 'mode'
  | 'timelineDates'
  | 'timeFormat'
  | 'userCells'
  | 'onAddCityClick'
  | 'onDeleteCity'
>;

export function TimelineGridToolbar({
  colorMode,
  isEditMode,
  mode,
  timeFormat,
  onAddCityClick,
  onColorModeButtonClick,
  onEditModeToggle,
  onResetClick,
  onTimeFormatButtonClick,
}: TimelineGridToolbarProps) {
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const { t } = useI18n();
  const modeClassName = mode === 'mobile' ? 'timelineGrid-toolbar_mobile' : 'timelineGrid-toolbar_desktop';

  return (
    <>
      <div className={`timelineGrid-toolbar ${modeClassName}`}>
        <button
          className="citiesHeaderButton citiesHeaderButton_menu"
          type="button"
          aria-label={t('common.menu')}
          onClick={() => setIsMenuModalOpen(true)}
        >
          <i className="citiesHeaderButton-icon citiesHeaderButton-icon_menu" />
        </button>
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
        <a
          href="/cities"
          className="citiesHeaderButton citiesHeaderButton_cities"
          aria-label={t('common.openCities')}
        >
          <i className="citiesHeaderButton-icon citiesHeaderButton-icon_cities" />
        </a>
      </div>
      <StandaloneMenuModal
        colorMode={colorMode}
        isOpen={isMenuModalOpen}
        timeFormat={timeFormat}
        onClose={() => setIsMenuModalOpen(false)}
        onColorModeButtonClick={onColorModeButtonClick}
        onTimeFormatButtonClick={onTimeFormatButtonClick}
      />
    </>
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
  onAddCityClick,
  onDeleteCity,
}: TimelineGridTimelineProps) {
  const { t } = useI18n();
  const userHoursModeClassName = mode === 'mobile'
    ? 'timelineGrid-userHours_mobile'
    : 'timelineGrid-userHours_desktop';

  const middleMarkerModeClassName = mode === 'mobile'
    ? 'timelineGridMiddleMarker_mobile'
    : 'timelineGridMiddleMarker_desktop';

  return (
    <>
      <div className={`timelineGrid-userHours ${userHoursModeClassName}`}>
        {userCells.map((cell, index) => {
          const shouldShowCurrentMinutes = cell.isCurrentHour && !cell.isDateLabel;
          const shouldShowCurrentDateTime = cell.isCurrentHour && cell.isDateLabel;
          const cellLabel = shouldShowCurrentMinutes
            ? cell.label.replace(DAY_PERIOD_SUFFIX_PATTERN, '')
            : cell.label;
          const currentTimeLabel = cell.periodLabel
            ? cell.currentTimeLabel.replace(cell.periodLabel, '')
            : cell.currentTimeLabel;

          return (
            <span
              className={[
                'timelineGrid-hour',
                cell.isCurrentHour ? 'timelineGrid-hour_current' : '',
                cell.isDateLabel ? 'timelineGrid-hour_date' : '',
                shouldShowCurrentMinutes ? 'timelineGrid-hour_withTime' : '',
                shouldShowCurrentDateTime ? 'timelineGrid-hour_withDateTime' : '',
              ].filter(Boolean).join(' ')}
              key={`user-${cell.date.toISOString()}-${index}`}
            >
              {shouldShowCurrentDateTime ? (
                <>
                  <span className="timelineGrid-hourDateValue">{cell.label}</span>
                  <span className="timelineGrid-hourCurrentTime">
                    <span className="timelineGrid-hourCurrentValue">{currentTimeLabel}</span>
                    {cell.periodLabel && (
                      <span className="timelineGrid-hourCurrentPeriod">{cell.periodLabel}</span>
                    )}
                  </span>
                </>
              ) : shouldShowCurrentMinutes ? (
                <span className="timelineGrid-hourCurrentTime">
                  <span className="timelineGrid-hourCurrentValue">{currentTimeLabel}</span>
                  {cell.periodLabel && (
                    <span className="timelineGrid-hourCurrentPeriod">{cell.periodLabel}</span>
                  )}
                </span>
              ) : (
                <TimelineCellLabel label={cellLabel} periodClassName="timelineGrid-periodMarker" />
              )}
            </span>
          );
        })}
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

      <button
        className={[
          'timelineGrid-addTimezoneButton',
          mode === 'mobile' ? 'timelineGrid-addTimezoneButton_mobile' : 'timelineGrid-addTimezoneButton_desktop',
        ].join(' ')}
        type="button"
        onClick={onAddCityClick}
      >
        <i className="timelineGrid-addTimezoneButtonIcon" />
        <span className="timelineGrid-addTimezoneButtonText">{t('common.addCity')}</span>
      </button>

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
        colorMode={props.colorMode}
        timeFormat={props.timeFormat}
        onAddCityClick={props.onAddCityClick}
        onColorModeButtonClick={props.onColorModeButtonClick}
        onEditModeToggle={props.onEditModeToggle}
        onResetClick={props.onResetClick}
        onTimeFormatButtonClick={props.onTimeFormatButtonClick}
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
        onAddCityClick={props.onAddCityClick}
        onDeleteCity={props.onDeleteCity}
      />
    </>
  );
}
