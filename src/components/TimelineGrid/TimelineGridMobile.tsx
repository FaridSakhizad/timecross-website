import './mobile/style.css';
import { useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Scan } from 'lucide-react';
import { useI18n } from '../../i18n';
import { getCityDisplayName } from '../Cities/useLocalizedCities';
import GridCalendarActions from './GridCalendarActions';
import { buildGridCalendarEvent, gridHourKey } from './desktop/gridSelection';
import TimelineGridActiveHourIndicator from './TimelineGridActiveHourIndicator';
import TimelineGridContent from './TimelineGridContent';
import type { TimelineGridShellProps } from './types';
import { useTimelineGridPageActiveHourIndicator } from './useTimelineGridActiveHourIndicator';
import { useTimelineGridPageSnap } from './useTimelineGridSnap';
import { useMobileGridSelection } from './mobile/useMobileGridSelection';

const EMPTY_SELECTION: NonNullable<TimelineGridShellProps['initialSelectedHours']> = [];

export default function TimelineGridMobile(props: TimelineGridShellProps) {
  const { t } = useI18n();
  const selectedHours = props.initialSelectedHours ?? EMPTY_SELECTION;
  const { enabled, toggle, clear, layerRef, interactionRef, isResizing } = useMobileGridSelection(
    selectedHours, props.onSelectionChange, props.isEditMode || props.isDragging,
    JSON.stringify([props.timelineDates[0]?.getTime(), props.cities.map((city) => city.id)]));
  const shouldSuspendSnap = useCallback(() => interactionRef.current, [interactionRef]);
  const selectedHourKeys = useMemo(() => new Set(selectedHours.map(gridHourKey)), [selectedHours]);
  const event = buildGridCalendarEvent(selectedHours,
    props.cities.map((city) => ({ id: city.id, name: getCityDisplayName(city), timezone: city.timezone })),
    props.browserTimezone, t('common.calendarEventTitle'));
  const resetGridScroll = useTimelineGridPageSnap(
    props.currentUserHourIndex,
    props.isDragging || props.isEditMode || isResizing,
    props.initialFocusHourIndex,
    shouldSuspendSnap,
  );
  const {
    direction: activeHourDirection,
    scrollActiveHourIntoView,
  } = useTimelineGridPageActiveHourIndicator(
    props.isDragging || props.isEditMode || isResizing,
  );

  return (
    <>
      <TimelineGridContent {...props} mode="mobile" selectedHourKeys={selectedHourKeys}
        onResetClick={() => { clear(); resetGridScroll(); }}
        onEditModeToggle={() => { clear(); props.onEditModeToggle(); }}
        onAddCityClick={() => { clear(); props.onAddCityClick(); }}
        afterResetControl={<>
          <button type="button" className={`citiesHeaderButton timelineGridSelectionModeButton ${enabled ? 'isActive' : ''}`}
            aria-label={t('common.selectHours')} title={t('common.selectHours')} aria-pressed={enabled}
            disabled={props.isEditMode || props.isDragging || !props.cities.length} onClick={toggle}>
            <Scan size={18} aria-hidden="true" />
          </button>
          {event && !props.isEditMode && <GridCalendarActions event={event} cities={props.cities} hours={selectedHours} />}
        </>} />
      {enabled && typeof document !== 'undefined' && createPortal(
        <div ref={layerRef} className="timelineGridSelectionLayer timelineGridSelectionLayer_mobile" hidden>
          <div className="timelineGridSelectionFrame" data-grid-selection-frame>
            {(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const).map((direction) => (
              <button key={direction} type="button" data-grid-resize={direction}
                className={`timelineGridSelectionHandle timelineGridSelectionHandle_${direction}`}
                aria-label={`${t('common.resizeSelection')} (${direction})`} title={t('common.resizeSelection')} />
            ))}
          </div>
        </div>, document.body,
      )}
      <TimelineGridActiveHourIndicator
        direction={activeHourDirection}
        onClick={scrollActiveHourIntoView}
      />
    </>
  );
}
