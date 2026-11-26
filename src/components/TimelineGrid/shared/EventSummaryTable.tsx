import './eventSummaryTable.css';

import { usePreferences } from '../../../hooks/usePreferences';
import { useI18n } from '../../../i18n';
import { getIntlLocale } from '../../../i18n/intlLocale';
import { cx } from '../../../utils/classNames';

import { formatEventDate, formatEventDuration, getEventSummaryRow } from './eventSummary';

type EventSummaryDateProps = {
  start: number;
  end: number;
  /** The visitor's time zone: the date and the hours are in it. */
  browserTimezone: string;
};

type EventSummaryTableProps = EventSummaryDateProps & {
  cities: {
    id: string;
    name: string;
    timezone: string;
  }[];
  /** With these, every city has a checkbox: whether the meeting is for it. */
  participantIds?: ReadonlySet<string>;
  onParticipantChange?: (cityId: string, included: boolean) => void;
};

/** How a summary writes dates and times: in the visitor's language, clock and time zone. */
function useSummaryOptions(browserTimezone: string) {
  const { language } = useI18n();
  const { timeFormat } = usePreferences();

  return { locale: getIntlLocale(language), timeFormat, referenceTimezone: browserTimezone };
}

/** A meeting on one line in the visitor's own time: "Your time: Sun, November 22 · 20:00 – 03:30 · 7h 30m". */
export function EventSummaryDate({ start, end, browserTimezone }: EventSummaryDateProps) {
  const { t } = useI18n();
  const options = useSummaryOptions(browserTimezone);
  const event = { start, end };

  return (
    <p className="eventSummary-date">
      {/* The viewer's own time: a meeting from a link may have no city in it. */}
      {t('common.yourTime')}
      {' '}
      {formatEventDate(event, options)}
      {'  ·  '}
      {getEventSummaryRow(event, '', browserTimezone, options).time}
      {'  ·  '}
      {formatEventDuration((end - start) / 60_000, t)}
    </p>
  );
}

/** A meeting's start and end in every city: "Madrid 16:00 – 18:00". Its date line is EventSummaryDate. */
export default function EventSummaryTable({
  start,
  end,
  cities,
  browserTimezone,
  participantIds,
  onParticipantChange,
}: EventSummaryTableProps) {
  const options = useSummaryOptions(browserTimezone);
  const rows = cities.map((city) => ({ city, ...getEventSummaryRow({ start, end }, city.name, city.timezone, options) }));

  return (
    <div className="eventSummary-times">
      {rows.map(({ city, ...row }, index) => (
        <div
          className={cx('eventSummary-row', participantIds && !participantIds.has(city.id) && 'isExcluded')}
          // A list may have one city twice ("Office" and "Home"): the position tells them apart.
          key={index}
        >
          <div className="eventSummary-city">
            {participantIds && onParticipantChange
              ? (
                  <label className="eventSummary-choice">
                    <input
                      type="checkbox"
                      checked={participantIds.has(city.id)}
                      onChange={(event) => onParticipantChange(city.id, event.target.checked)}
                    />
                    {row.name}
                  </label>
                )
              : row.name}
          </div>
          <div className="eventSummary-time">
            {row.otherDay && <span className="eventSummary-day">{row.otherDay}</span>}

            {row.time}
          </div>
        </div>
      ))}
    </div>
  );
}
