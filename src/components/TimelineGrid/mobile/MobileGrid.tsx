import './style.css';
import { useCallback, useMemo, useRef } from 'react';
import { useI18n } from '../../../i18n';
import { getCityDisplayName } from '../../Cities/useLocalizedCities';
import { buildGridCalendarEvent, gridHourKey } from '../shared/gridSelection';
import TimelineGridActiveHourIndicator from '../shared/GridActiveHourIndicator';
import MobileTimeline from './MobileTimeline';
import MobileToolbar from './MobileToolbar';
import MobileSelectionControls from './MobileSelectionControls';
import MobileSelectionOverlay from './MobileSelectionOverlay';
import type { TimelineGridShellProps } from '../shared/types';
import { useTimelineGridActiveHourIndicator } from '../shared/useGridActiveHourIndicator';
import { useTimelineGridSnap } from '../shared/useGridScrollSnap';
import { useMobileGridSelection } from './useMobileGridSelection';
import { useMobileGridHorizontalScrollLock } from './useMobileGridHorizontalScrollLock';

const EMPTY_SELECTION: NonNullable<TimelineGridShellProps['initialSelectedHours']> = [];

export default function MobileGrid(props: TimelineGridShellProps) {
  const { t } = useI18n();
  const viewportRef = useRef<HTMLDivElement>(null);
  const embedded = props.presentation === 'embedded';
  useMobileGridHorizontalScrollLock(!embedded && props.isEditMode);
  const getScrollTarget = useCallback(() => embedded
    ? viewportRef.current ? { type: 'element' as const, element: viewportRef.current } : null
    : { type: 'page' as const }, [embedded]);
  const selectedHours = props.initialSelectedHours ?? EMPTY_SELECTION;
  const { enabled, toggle, clear, layerRef, interactionRef, isResizing } = useMobileGridSelection(
    selectedHours, props.onSelectionChange, props.isEditMode || props.isDragging,
    JSON.stringify([props.timelineDates[0]?.getTime(), props.cities.map((city) => city.id)]),
    embedded ? viewportRef : undefined);
  const shouldSuspendSnap = useCallback(() => interactionRef.current, [interactionRef]);
  const selectedHourKeys = useMemo(() => new Set(selectedHours.map(gridHourKey)), [selectedHours]);
  const event = buildGridCalendarEvent(selectedHours,
    props.cities.map((city) => ({ id: city.id, name: getCityDisplayName(city), timezone: city.timezone })),
    props.browserTimezone, t('common.calendarEventTitle'));
  const resetGridScroll = useTimelineGridSnap(
    getScrollTarget,
    props.currentUserHourIndex,
    props.isDragging || props.isEditMode || isResizing,
    shouldSuspendSnap,
    props.initialFocusHourIndex,
    props.onHourChange,
  );
  const {
    direction: activeHourDirection,
    scrollActiveHourIntoView,
  } = useTimelineGridActiveHourIndicator(
    getScrollTarget,
    props.isDragging || props.isEditMode || isResizing,
  );

  const toolbar = (
    <MobileToolbar {...props}
      calendarEvent={event}
      selectedHours={selectedHours}
      selectionEnabled={enabled}
      selectionDisabled={props.isEditMode || props.isDragging || !props.cities.length}
      onSelectionToggle={toggle}
      onResetClick={() => { clear(); resetGridScroll(); props.onReset?.(); }}
      onEditModeToggle={() => { clear(); props.onEditModeToggle(); }}
      onAddCityClick={() => { clear(); props.onAddCityClick(); }} />
  );

  const timeline = (
    <MobileTimeline
      {...props}
      selectedHourKeys={selectedHourKeys}
      onAddCityClick={() => { clear(); props.onAddCityClick(); }}
    />
  );

  return (
    <>
      {embedded ? (
        <div className="timelineGridMobileEmbedded">
          <div
            ref={viewportRef}
            className="timelineGrid-scrollViewport"
          >
            <div className="timelineGridBackdrop" aria-hidden="true" />
            {toolbar}
            {timeline}
            <TimelineGridActiveHourIndicator
              direction={activeHourDirection}
              onClick={scrollActiveHourIntoView}
            />

            <div className="zenPageMobile-footer">
              <MobileSelectionControls
                calendarEvent={event}
                cities={props.cities}
                selectedHours={selectedHours}
                isEditMode={props.isEditMode}
                selectionEnabled={enabled}
                selectionDisabled={props.isEditMode || props.isDragging || !props.cities.length}
                onSelectionToggle={toggle}
              />
            </div>
          </div>
        </div>
      ) : <>
        <div className="zenPageMobile">
          <div className="timelineGridBackdrop" aria-hidden="true" />
          {toolbar}
          {timeline}
          <TimelineGridActiveHourIndicator
            direction={activeHourDirection}
            onClick={scrollActiveHourIntoView}
          />
          <div className="zenPageMobile-footer">
            <MobileSelectionControls
              calendarEvent={event}
              cities={props.cities}
              selectedHours={selectedHours}
              isEditMode={props.isEditMode}
              selectionEnabled={enabled}
              selectionDisabled={props.isEditMode || props.isDragging || !props.cities.length}
              onSelectionToggle={toggle}
            />
          </div>
        </div>
      </>}
      <MobileSelectionOverlay enabled={enabled} layerRef={layerRef} />
    </>
  );
}
