import './meetingDialog.css';

import { CalendarDays, CalendarPlus, Check, ClipboardCopy, Download, Link2, Share2 } from 'lucide-react';

import { FEATURES } from '../../../config';
import { useI18n } from '../../../i18n';
import type { StoredCity } from '../../../settings';
import Modal from '../../Modal';
import EventSummaryTable, { EventSummaryDate } from '../shared/EventSummaryTable';
import { MAX_EVENT_TITLE_LENGTH } from '../shared/eventUrlState';
import type { SelectedGridSlot } from '../shared/gridSelection';
import { useMeetingDraft } from '../shared/useMeetingDraft';

type MobileMeetingDialogProps = {
  isOpen: boolean;
  cities: StoredCity[];
  hours: SelectedGridSlot[];
  browserTimezone: string;
  participantIds: ReadonlySet<string>;
  onParticipantChange: (cityId: string, included: boolean) => void;
  onClose: () => void;
};

/**
 * On a phone, the selected meeting in a dialog from the footer: its title, date and cities, then
 * what to do with it, each action a whole row within reach of the thumb. Kept while it is closed,
 * so a title typed in it is still there when it opens again.
 */
export default function MobileMeetingDialog({
  isOpen,
  cities,
  hours,
  browserTimezone,
  participantIds,
  onParticipantChange,
  onClose,
}: MobileMeetingDialogProps) {
  const { t } = useI18n();
  const meeting = useMeetingDraft({ cities, hours, browserTimezone, participantIds, systemShare: true });
  const { span, calendarEvent } = meeting;

  if (!span) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      className="meetingDialog"
      title={t('common.createEvent')}
      onClose={onClose}
    >
      <div className="meetingDialog-body">
        <input
          className="meetingDialog-title"
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
        <EventSummaryTable
          start={span.start}
          end={span.end}
          cities={meeting.selectedCities}
          browserTimezone={browserTimezone}
          participantIds={participantIds}
          onParticipantChange={onParticipantChange}
        />

        {!calendarEvent && (
          <p className="meetingDialog-hint">{t('common.selectParticipantsHint')}</p>
        )}

        <div className="meetingDialog-actions">
          <a
            className="button meetingDialog-action"
            href={calendarEvent?.url}
            aria-disabled={!calendarEvent || undefined}
            target="_blank"
            rel="noopener noreferrer"
          >
            <CalendarPlus
              size={18}
              aria-hidden="true"
            />
            {t('common.createCalendarEvent')}
          </a>
          <a
            className="button meetingDialog-action"
            href={meeting.outlookUrl}
            aria-disabled={!calendarEvent || undefined}
            target="_blank"
            rel="noopener noreferrer"
          >
            <CalendarDays
              size={18}
              aria-hidden="true"
            />
            {t('common.createOutlookEvent')}
          </a>
          <button
            className="button meetingDialog-action"
            type="button"
            disabled={!calendarEvent}
            onClick={meeting.downloadEvent}
          >
            <Download
              size={18}
              aria-hidden="true"
            />
            {t('common.downloadCalendarEvent')}
          </button>
          <button
            className="button meetingDialog-action"
            type="button"
            disabled={!calendarEvent}
            onClick={meeting.copyText}
          >
            {meeting.isTextCopied
              ? (
                  <Check
                    size={18}
                    aria-hidden="true"
                  />
                )
              : (
                  <ClipboardCopy
                    size={18}
                    aria-hidden="true"
                  />
                )}
            {meeting.textLabel}
          </button>

          {FEATURES.shareEvent && meeting.canLink && meeting.canShare && (
            <button
              className="button meetingDialog-action"
              type="button"
              disabled={!meeting.eventUrl}
              onClick={meeting.share}
            >
              <Share2
                size={18}
                aria-hidden="true"
              />
              {t('sharedEvent.shareButton')}
            </button>
          )}
          {FEATURES.shareEvent && meeting.canLink && (
            <button
              className="button meetingDialog-action"
              type="button"
              disabled={!meeting.eventUrl}
              onClick={meeting.copyLink}
            >
              {meeting.isLinkCopied
                ? (
                    <Check
                      size={18}
                      aria-hidden="true"
                    />
                  )
                : (
                    <Link2
                      size={18}
                      aria-hidden="true"
                    />
                  )}
              {meeting.linkLabel}
            </button>
          )}
        </div>

        {meeting.errorKey && (
          <p
            className="meetingDialog-error"
            role="alert"
          >
            {t(meeting.errorKey)}
          </p>
        )}
      </div>
    </Modal>
  );
}
