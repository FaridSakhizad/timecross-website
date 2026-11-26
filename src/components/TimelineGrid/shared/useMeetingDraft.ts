import { useEffect, useState } from 'react';

import { FEATURES } from '../../../config';
import { usePreferences } from '../../../hooks/usePreferences';
import { useI18n } from '../../../i18n';
import { getIntlLocale } from '../../../i18n/intlLocale';
import { MEETING_LINK_PATH } from '../../../routes';
import type { StoredCity } from '../../../settings';
import { preload } from '../../../utils/preload';
import { getCityDisplayName } from '../../Cities/useLocalizedCities';

import { getLoadedCalendarFileModule, loadCalendarFileModule } from './calendarFileLoader';
import { formatEventText } from './eventSummary';
import { buildGridEventUrl } from './eventUrlState';
import {
  buildGridCalendarEvent,
  buildOutlookCalendarUrl,
  getMeetingSlots,
  getMeetingSpan,
  type SelectedGridSlot,
} from './gridSelection';
import { shareEventLink } from './shareEventLink';

/**
 * What the last action did: copied the link or the meeting's text, or failed at it. `value` is what
 * was copied: once the meeting changes, it no longer counts as copied.
 */
type Status = { kind: 'copied' | 'textCopied' | 'failed' | 'textFailed'; value: string } | null;

type MeetingDraftOptions = {
  cities: StoredCity[];
  hours: SelectedGridSlot[];
  browserTimezone: string;
  /** Who the meeting is for: the selected cities still checked. */
  participantIds: ReadonlySet<string>;
  /** On a phone: the system share sheet, where there is one, is the main way to send the link. */
  systemShare?: boolean;
};

/**
 * The meeting being put together from a selection, whatever shows it (the card by the frame, the
 * dialog on a phone): its title, hours and cities, and what can be done with it. Nothing is created
 * until one of the actions is chosen. Without checked cities there is nothing to put in a calendar
 * or a link.
 */
export function useMeetingDraft({ cities, hours, browserTimezone, participantIds, systemShare = false }: MeetingDraftOptions) {
  const { language, t } = useI18n();
  const { timeFormat } = usePreferences();
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const span = getMeetingSpan(hours);
  const meetingSlots = getMeetingSlots(hours, participantIds);
  const coveredIds = new Set(hours.map((hour) => hour.rowId));
  // The selected cities, each with a checkbox in the summary.
  const selectedCities = cities
    .filter((city) => coveredIds.has(city.id))
    .map((city) => ({ id: city.id, name: getCityDisplayName(city), timezone: city.timezone }));
  const participants = selectedCities.filter((city) => participantIds.has(city.id));
  const eventTitle = title.trim() || t('common.calendarEventTitle');
  const calendarEvent = buildGridCalendarEvent(meetingSlots, participants, browserTimezone, eventTitle);
  const linkBase = typeof window === 'undefined' ? null : `${window.location.origin}${MEETING_LINK_PATH}`;
  const eventUrl = linkBase && buildGridEventUrl(linkBase, cities, meetingSlots, title, language);
  const canShare = systemShare && typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const eventText = calendarEvent && formatEventText(
    calendarEvent,
    eventTitle,
    participants,
    { locale: getIntlLocale(language), timeFormat, referenceTimezone: browserTimezone },
    t,
    FEATURES.shareEvent ? eventUrl : null,
  );
  const isLinkCopied = status?.kind === 'copied' && status.value === eventUrl;
  const isTextCopied = status?.kind === 'textCopied' && status.value === eventText;
  let errorKey: 'common.calendarShareError' | 'common.calendarFileError' | 'common.copyEventDetailsError' | null = null;

  if (status?.kind === 'failed') {
    errorKey = status.value ? 'common.calendarShareError' : 'common.calendarFileError';
  }

  if (status?.kind === 'textFailed') {
    errorKey = 'common.copyEventDetailsError';
  }

  useEffect(() => {
    preload(loadCalendarFileModule);
  }, []);

  const changeTitle = (value: string) => {
    setTitle(value);
    setStatus(null);
  };

  const downloadEvent = async () => {
    if (!calendarEvent) {
      return;
    }

    try {
      const module = getLoadedCalendarFileModule() ?? await loadCalendarFileModule();

      module.downloadCalendarFile(module.createCalendarEventFile(calendarEvent));
    } catch {
      setStatus({ kind: 'failed', value: '' });
    }
  };

  const share = async () => {
    if (!eventUrl) {
      return;
    }

    try {
      // Nothing is awaited before the share sheet opens: it needs the tap's user activation.
      if (await shareEventLink(eventUrl, navigator) === 'copied') {
        setStatus({ kind: 'copied', value: eventUrl });
      }
    } catch {
      setStatus({ kind: 'failed', value: eventUrl });
    }
  };

  /** The meeting as text, with its link when links are on: to paste into a chat or an email. */
  const copyText = async () => {
    if (!eventText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(eventText);
      setStatus({ kind: 'textCopied', value: eventText });
    } catch {
      setStatus({ kind: 'textFailed', value: '' });
    }
  };

  const copyLink = async () => {
    if (!eventUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(eventUrl);
      setStatus({ kind: 'copied', value: eventUrl });
    } catch {
      setStatus({ kind: 'failed', value: eventUrl });
    }
  };

  return {
    title,
    changeTitle,
    span,
    selectedCities,
    calendarEvent,
    outlookUrl: calendarEvent ? buildOutlookCalendarUrl(calendarEvent) : undefined,
    /** Links can be made: in the browser, not while rendering on the server. */
    canLink: linkBase !== null,
    eventUrl,
    canShare,
    isLinkCopied,
    linkLabel: t(isLinkCopied ? 'sharedEvent.linkCopied' : 'sharedEvent.copyLink'),
    isTextCopied,
    textLabel: t(isTextCopied ? 'common.eventDetailsCopied' : 'common.copyEventDetails'),
    /** What went wrong with the last action, if anything. */
    errorKey,
    downloadEvent,
    share,
    copyText,
    copyLink,
  };
}
