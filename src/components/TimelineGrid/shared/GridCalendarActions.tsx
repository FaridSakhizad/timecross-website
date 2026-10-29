import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CalendarPlus, Check, Download, Share2 } from 'lucide-react';
import { useI18n } from '../../../i18n';
import { getCanonicalLanguagePath } from '../../../i18n/languageRouting';
import type { FavoriteCity } from '../../Cities/fixtures';
import type { GridCalendarEvent } from './gridSelection';
import { buildOutlookCalendarUrl, type SelectedGridHour } from './gridSelection';
import { createCalendarEventFile, downloadCalendarFile } from './calendarEventFile';
import { buildGridEventUrl } from './eventUrlState';
import { shareEventLink } from './shareEventLink';

const SHARE_EVENT_VISIBLE = false;

export default function GridCalendarActions({ event, cities, hours }: {
  event: GridCalendarEvent | null; cities: FavoriteCity[]; hours: SelectedGridHour[];
}) {
  const { t, language } = useI18n();
  const start = event?.start;
  const end = event?.end;
  const title = event?.title;
  const details = event?.details;
  const file = useMemo(() => {
    if (start === undefined || end === undefined || title === undefined || details === undefined) return null;
    try {
      return createCalendarEventFile({ start, end, title, details });
    } catch {
      return null;
    }
  }, [start, end, title, details]);
  const [failure, setFailure] = useState<{ file: File | null; kind: 'download' | 'share' } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const sharingRef = useRef(false);
  const eventUrl = useMemo(() => !event || typeof window === 'undefined' ? null : buildGridEventUrl(
    `${window.location.origin}${getCanonicalLanguagePath(language, '/grid')}`, cities, hours,
  ), [event, language, cities, hours]);
  const visibleFailure = event && failure && failure.file === file ? failure.kind : null;

  useEffect(() => {
    if (!copiedUrl) return;
    const timer = window.setTimeout(() => setCopiedUrl(null), 4000);
    return () => window.clearTimeout(timer);
  }, [copiedUrl]);

  const share = async () => {
    if (!eventUrl || sharingRef.current) return;
    sharingRef.current = true;
    setSharing(true);
    setFailure(null);
    try {
      const result = await shareEventLink(eventUrl, navigator);
      if (result === 'copied') setCopiedUrl(eventUrl);
    } catch {
      setFailure({ file, kind: 'share' });
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  };

  return (
    <>
      {event ? <a className="widgetHeaderButton timelineGridCalendarButton" href={event.url}
        target="_blank" rel="noopener noreferrer"
        aria-label={t('common.createCalendarEvent')} title={t('common.createCalendarEvent')}>
        <CalendarPlus size={18} aria-hidden="true" />
      </a> : <button className="widgetHeaderButton timelineGridCalendarButton" type="button" disabled
        aria-label={t('common.createCalendarEvent')} title={t('common.createCalendarEvent')}>
        <CalendarPlus size={18} aria-hidden="true" />
      </button>}
      {event ? <a className="widgetHeaderButton timelineGridCalendarButton" href={buildOutlookCalendarUrl(event)}
        target="_blank" rel="noopener noreferrer"
        aria-label={t('common.createOutlookEvent')} title={t('common.createOutlookEvent')}>
        <CalendarDays size={18} aria-hidden="true" />
      </a> : <button className="widgetHeaderButton timelineGridCalendarButton" type="button" disabled
        aria-label={t('common.createOutlookEvent')} title={t('common.createOutlookEvent')}>
        <CalendarDays size={18} aria-hidden="true" />
      </button>}
      <button className="widgetHeaderButton timelineGridCalendarButton" type="button" disabled={!file}
        aria-label={t('common.downloadCalendarEvent')} title={t('common.downloadCalendarEvent')}
        onClick={() => {
          setFailure(null);
          try {
            if (!file) throw new Error('Calendar file unavailable');
            downloadCalendarFile(file);
          } catch {
            setFailure({ file, kind: 'download' });
          }
        }}>
        <Download size={18} aria-hidden="true" />
      </button>
      {SHARE_EVENT_VISIBLE && <button
        className="widgetHeaderButton timelineGridCalendarButton" type="button" disabled={!eventUrl || sharing}
        aria-label={t('common.shareEvent')}
        title={t(eventUrl && copiedUrl === eventUrl ? 'common.eventLinkCopied' : 'common.shareEvent')}
        onClick={share}
      >
        {eventUrl && copiedUrl === eventUrl ? <Check size={18} aria-hidden="true" /> : <Share2 size={18} aria-hidden="true" />}
      </button>}
      {copiedUrl === eventUrl && eventUrl && <span className="timelineGridCalendarNotice" role="status">
        {t('common.eventLinkCopied')}
      </span>}
      {visibleFailure && <span className="timelineGridCalendarError" role="alert">
        {t(visibleFailure === 'share' ? 'common.calendarShareError' : 'common.calendarFileError')}
      </span>}
    </>
  );
}
