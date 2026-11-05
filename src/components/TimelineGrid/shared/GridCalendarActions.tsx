import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CalendarPlus, Check, Download, Share2 } from 'lucide-react';
import { useI18n } from '../../../i18n';
import { getCanonicalLanguagePath } from '../../../i18n/languageRouting';
import type { StoredCity } from '../../../settings';
import type { GridCalendarEvent } from './gridSelection';
import { buildOutlookCalendarUrl, type SelectedGridHour } from './gridSelection';
import { buildGridEventUrl } from './eventUrlState';
import { shareEventLink } from './shareEventLink';
import { PAGES } from '../../../routes';
import { FEATURES } from '../../../config';
import { preload } from '../../../utils/preload';
import type * as CalendarEventFile from './calendarEventFile';

// The .ics generator (ics + yup) is a separate chunk: preloaded once a selection exists,
// so the download still starts synchronously inside the click.
type CalendarFileModule = typeof CalendarEventFile;
let calendarFileModule: CalendarFileModule | null = null;
let calendarFileModulePromise: Promise<CalendarFileModule> | null = null;

function loadCalendarFileModule() {
  calendarFileModulePromise ??= import('./calendarEventFile')
    .then((module) => {
      calendarFileModule = module;
      return module;
    })
    .catch((error: unknown) => {
      calendarFileModulePromise = null;
      throw error;
    });

  return calendarFileModulePromise;
}

type GridCalendarActionsProps = {
  event: GridCalendarEvent | null;
  cities: StoredCity[];
  hours: SelectedGridHour[];
};

export default function GridCalendarActions({
  event,
  cities,
  hours,
}: GridCalendarActionsProps) {
  const { t, language } = useI18n();
  const start = event?.start;
  const end = event?.end;
  const title = event?.title;
  const details = event?.details;
  const eventKey = event ? JSON.stringify([start, end, title, details]) : null;
  const [failure, setFailure] = useState<{ eventKey: string | null; kind: 'download' | 'share' } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const sharingRef = useRef(false);
  const eventUrl = useMemo(() => (!event || typeof window === 'undefined'
    ? null
    : buildGridEventUrl(
        `${window.location.origin}${getCanonicalLanguagePath(language, PAGES.grid.path)}`,
        cities,
        hours,
      )), [event, language, cities, hours]);
  const visibleFailure = event && failure && failure.eventKey === eventKey ? failure.kind : null;

  useEffect(() => {
    if (event) {
      preload(loadCalendarFileModule);
    }
  }, [event]);

  const downloadEvent = async () => {
    setFailure(null);

    try {
      if (start === undefined || end === undefined || title === undefined || details === undefined) {
        throw new Error('No event to download');
      }

      const module = calendarFileModule ?? await loadCalendarFileModule();

      module.downloadCalendarFile(module.createCalendarEventFile({ start, end, title, details }));
    } catch {
      setFailure({ eventKey, kind: 'download' });
    }
  };

  useEffect(() => {
    if (!copiedUrl) {
      return;
    }

    const timer = window.setTimeout(() => setCopiedUrl(null), 4000);

    return () => window.clearTimeout(timer);
  }, [copiedUrl]);

  const share = async () => {
    if (!eventUrl || sharingRef.current) {
      return;
    }

    sharingRef.current = true;
    setSharing(true);
    setFailure(null);

    try {
      const result = await shareEventLink(eventUrl, navigator);

      if (result === 'copied') {
        setCopiedUrl(eventUrl);
      }
    } catch {
      setFailure({ eventKey, kind: 'share' });
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  };

  return (
    <>
      {event
        ? (
            <a
              className="widgetHeaderButton timelineGridCalendarButton"
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('common.createCalendarEvent')}
              title={t('common.createCalendarEvent')}
            >
              <CalendarPlus
                size={18}
                aria-hidden="true"
              />
            </a>
          )
        : (
            <button
              className="widgetHeaderButton timelineGridCalendarButton"
              type="button"
              disabled
              aria-label={t('common.createCalendarEvent')}
              title={t('common.createCalendarEvent')}
            >
              <CalendarPlus
                size={18}
                aria-hidden="true"
              />
            </button>
          )}
      {event
        ? (
            <a
              className="widgetHeaderButton timelineGridCalendarButton"
              href={buildOutlookCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('common.createOutlookEvent')}
              title={t('common.createOutlookEvent')}
            >
              <CalendarDays
                size={18}
                aria-hidden="true"
              />
            </a>
          )
        : (
            <button
              className="widgetHeaderButton timelineGridCalendarButton"
              type="button"
              disabled
              aria-label={t('common.createOutlookEvent')}
              title={t('common.createOutlookEvent')}
            >
              <CalendarDays
                size={18}
                aria-hidden="true"
              />
            </button>
          )}
      <button
        className="widgetHeaderButton timelineGridCalendarButton"
        type="button"
        disabled={!event}
        aria-label={t('common.downloadCalendarEvent')}
        title={t('common.downloadCalendarEvent')}
        onClick={downloadEvent}
      >
        <Download
          size={18}
          aria-hidden="true"
        />
      </button>
      {FEATURES.shareEvent && (
        <button
          className="widgetHeaderButton timelineGridCalendarButton"
          type="button"
          disabled={!eventUrl || sharing}
          aria-label={t('common.shareEvent')}
          title={t(eventUrl && copiedUrl === eventUrl ? 'common.eventLinkCopied' : 'common.shareEvent')}
          onClick={share}
        >
          {eventUrl && copiedUrl === eventUrl
            ? (
                <Check
                  size={18}
                  aria-hidden="true"
                />
              )
            : (
                <Share2
                  size={18}
                  aria-hidden="true"
                />
              )}
        </button>
      )}
      {copiedUrl === eventUrl && eventUrl && (
        <span
          className="timelineGridCalendarNotice"
          role="status"
        >
          {t('common.eventLinkCopied')}
        </span>
      )}
      {visibleFailure && (
        <span
          className="timelineGridCalendarError"
          role="alert"
        >
          {t(visibleFailure === 'share' ? 'common.calendarShareError' : 'common.calendarFileError')}
        </span>
      )}
    </>
  );
}
