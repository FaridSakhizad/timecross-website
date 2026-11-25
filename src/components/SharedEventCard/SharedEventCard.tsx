import './style.css';

import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';

import { useI18n } from '../../i18n';
import { preload } from '../../utils/preload';
import { getBrowserTimezone } from '../../utils/time';
import { getCityDisplayName, useLocalizedCities } from '../Cities/useLocalizedCities';
import { getLoadedCalendarFileModule, loadCalendarFileModule } from '../TimelineGrid/shared/calendarFileLoader';
import EventSummaryTable, { EventSummaryDate } from '../TimelineGrid/shared/EventSummaryTable';
import { getEventParams, readGridEventUrlState, type SharedGridEvent } from '../TimelineGrid/shared/eventUrlState';
import { buildGridCalendarEvent, buildOutlookCalendarUrl } from '../TimelineGrid/shared/gridSelection';

/** The meeting of a shared link, above the planner: its date and its hours in every city. */
export default function SharedEventCard() {
  const { search, hash } = useLocation();
  const eventParams = getEventParams(search, hash);
  const event = useMemo(() => readGridEventUrlState(eventParams), [eventParams]);

  return event ? <EventCard event={event} /> : null;
}

function EventCard({ event }: { event: SharedGridEvent }) {
  const { t } = useI18n();
  const [hasDownloadFailed, setHasDownloadFailed] = useState(false);
  const cities = useLocalizedCities(event.cities);
  const browserTimezone = getBrowserTimezone();
  const title = event.title || t('sharedEvent.defaultTitle');
  const calendarEvent = buildGridCalendarEvent(
    event.hours,
    cities.map((city) => ({ id: city.id, name: getCityDisplayName(city), timezone: city.timezone })),
    browserTimezone,
    title,
  );

  useEffect(() => {
    preload(loadCalendarFileModule);
  }, []);

  const downloadEvent = async () => {
    setHasDownloadFailed(false);

    try {
      if (!calendarEvent) {
        throw new Error('No event to download');
      }

      const module = getLoadedCalendarFileModule() ?? await loadCalendarFileModule();

      module.downloadCalendarFile(module.createCalendarEventFile(calendarEvent));
    } catch {
      setHasDownloadFailed(true);
    }
  };

  return (
    <section className="sharedEventCard">
      <h2 className="sharedEventCard-title">{title}</h2>
      <EventSummaryDate
        start={event.start}
        end={event.end}
        browserTimezone={browserTimezone}
      />
      <EventSummaryTable
        start={event.start}
        end={event.end}
        cities={cities.map((city) => ({ id: city.id, name: getCityDisplayName(city), timezone: city.timezone }))}
        browserTimezone={browserTimezone}
      />

      {calendarEvent && (
        <div className="sharedEventCard-actions">
          <a
            className="button sharedEventCard-action"
            href={calendarEvent.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('sharedEvent.googleCalendar')}
          </a>
          <a
            className="button sharedEventCard-action"
            href={buildOutlookCalendarUrl(calendarEvent)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('sharedEvent.outlook')}
          </a>
          <button
            className="button sharedEventCard-action"
            type="button"
            onClick={downloadEvent}
          >
            {t('sharedEvent.ics')}
          </button>
        </div>
      )}
      {hasDownloadFailed && (
        <p
          className="sharedEventCard-error"
          role="alert"
        >
          {t('common.calendarFileError')}
        </p>
      )}
    </section>
  );
}
