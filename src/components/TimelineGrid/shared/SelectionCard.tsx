import './selectionCard.css';

import { Check, Link2 } from 'lucide-react';
import { useEffect, useRef, type Ref } from 'react';

import { FEATURES } from '../../../config';
import { useI18n } from '../../../i18n';
import type { StoredCity } from '../../../settings';
import { cx } from '../../../utils/classNames';

import EventSummaryTable, { EventSummaryDate } from './EventSummaryTable';
import { MAX_EVENT_TITLE_LENGTH } from './eventUrlState';
import type { SelectedGridSlot } from './gridSelection';
import { useMeetingDraft } from './useMeetingDraft';

type SelectionCardProps = {
  cities: StoredCity[];
  hours: SelectedGridSlot[];
  browserTimezone: string;
  /** Who the meeting is for: the selected cities still checked in its list. */
  participantIds: ReadonlySet<string>;
  onParticipantChange: (cityId: string, included: boolean) => void;
  /** Its view places it: the card's position is not part of its props. */
  cardRef?: Ref<HTMLDivElement>;
  /** Folded into an icon: the title and the rest are kept for when it opens again. */
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

/**
 * What the selected hours are, next to the selection: an optional title, the date, the start and
 * end in every selected city, then what to do with them. Nothing is created until one of the
 * actions is chosen.
 */
export default function SelectionCard({
  cities,
  hours,
  browserTimezone,
  participantIds,
  onParticipantChange,
  cardRef,
  collapsed,
  onCollapsedChange,
}: SelectionCardProps) {
  const { t } = useI18n();
  const meeting = useMeetingDraft({ cities, hours, browserTimezone, participantIds });
  const { span, calendarEvent } = meeting;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const shouldFocusToggle = useRef(false);

  // The button pressed is gone with the view it was in: the focus moves to its counterpart.
  useEffect(() => {
    if (shouldFocusToggle.current) {
      shouldFocusToggle.current = false;
      toggleRef.current?.focus();
    }
  }, [collapsed]);

  if (!span) {
    return null;
  }

  const toggleCollapsed = () => {
    shouldFocusToggle.current = true;
    onCollapsedChange(!collapsed);
  };

  const className = cx(
    'selectionCard',
    collapsed && 'selectionCard_collapsed',
  );

  if (collapsed) {
    return (
      <div
        ref={cardRef}
        className={className}
        data-grid-selection-card
      >
        <button
          ref={toggleRef}
          className="selectionCard-expand"
          type="button"
          aria-label={t('common.expandSelectionCard')}
          data-tooltip={t('common.expandSelectionCard')}
          onClick={toggleCollapsed}
        />
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={className}
      data-grid-selection-card
    >
      <button
        ref={toggleRef}
        className="selectionCard-close"
        type="button"
        aria-label={t('common.collapseSelectionCard')}
        data-tooltip={t('common.collapseSelectionCard')}
        onClick={toggleCollapsed}
      >
        <i className="selectionCard-close-icon" />
      </button>

      <div className="selectionCard-header">
        <input
          className="selectionCard-title"
          value={meeting.title}
          maxLength={MAX_EVENT_TITLE_LENGTH}
          placeholder={t('sharedEvent.titleLabel')}
          aria-label={t('sharedEvent.titleLabel')}
          autoComplete="off"
          onChange={(event) => meeting.changeTitle(event.target.value)}
        />
        <EventSummaryDate
          start={span.start}
          end={span.end}
          browserTimezone={browserTimezone}
        />
      </div>

      <div className="selectionCard-content">
        <EventSummaryTable
          start={span.start}
          end={span.end}
          cities={meeting.selectedCities}
          browserTimezone={browserTimezone}
          participantIds={participantIds}
          onParticipantChange={onParticipantChange}
        />
      </div>

      <div className="selectionCard-actions">
        <a
          className="selectionCard-action selectionCard-action_gCalendar"
          href={calendarEvent?.url}
          aria-disabled={!calendarEvent || undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('common.createCalendarEvent')}
          data-tooltip={t('common.createCalendarEvent')}
        />

        <a
          className="selectionCard-action selectionCard-action_outlook"
          href={meeting.outlookUrl}
          aria-disabled={!calendarEvent || undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('common.createOutlookEvent')}
          data-tooltip={t('common.createOutlookEvent')}
        />

        <button
          className="selectionCard-action selectionCard-action_download"
          type="button"
          aria-label={t('common.downloadCalendarEvent')}
          data-tooltip={t('common.downloadCalendarEvent')}
          disabled={!calendarEvent}
          onClick={meeting.downloadEvent}
        />

        <button
          className={cx('selectionCard-action selectionCard-action_copy', meeting.isTextCopied && 'isCopied')}
          type="button"
          aria-label={meeting.textLabel}
          data-tooltip={meeting.textLabel}
          disabled={!calendarEvent}
          onClick={meeting.copyText}
        />

        {FEATURES.shareEvent && meeting.canLink && (
          <button
            className={cx('selectionCard-action selectionCard-action_link', meeting.isLinkCopied && 'isCopied')}
            type="button"
            aria-label={meeting.linkLabel}
            data-tooltip={meeting.linkLabel}
            disabled={!meeting.eventUrl}
            onClick={meeting.copyLink}
          >
            {meeting.isLinkCopied
              ? (
                  <Check
                    size={16}
                    aria-hidden="true"
                  />
                )
              : (
                  <Link2
                    size={16}
                    aria-hidden="true"
                  />
                )}
          </button>
        )}
      </div>

      {meeting.errorKey && (
        <p
          className="selectionCard-error"
          role="alert"
        >
          {t(meeting.errorKey)}
        </p>
      )}
    </div>
  );
}
