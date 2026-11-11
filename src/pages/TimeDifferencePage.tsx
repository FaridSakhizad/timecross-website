import './TimeDifferencePage.css';

import { useSyncExternalStore } from 'react';
import { Navigate, useParams } from 'react-router';

import { CITIES, type CityId } from '../cities';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';
import Header from '../components/Header';
import Seo from '../components/Seo';
import { useCurrentMinuteDate } from '../hooks/useCurrentMinuteDate';
import { usePreferences } from '../hooks/usePreferences';
import { useI18n } from '../i18n';
import { translate } from '../i18n/dictionaries';
import { getIntlLocale } from '../i18n/intlLocale';
import { getCanonicalLanguagePath } from '../i18n/languageRouting';
import { PAGES, getMovedPagePath, getTimeDifferencePath } from '../routes';
import {
  WORKING_HOURS,
  getCityPair,
  getCityPairs,
  getDifferencePeriods,
  getHourToday,
  type CityPair,
} from '../timeDifference';
import {
  formatHours,
  getCallSentence,
  getChangesSentence,
  getDifferenceSentence,
  getPairCityNames,
  getTimeDifferenceFaq,
  type PairTextContext,
} from '../timeDifferenceTexts';
import { cx } from '../utils/classNames';
import { formatClockTime, getRelativeDayMarker } from '../utils/time';

import NotFoundPage from './NotFoundPage';

const WORKING_DAY_HOURS = Array.from(
  { length: WORKING_HOURS.end - WORKING_HOURS.start + 1 },
  (_, index) => WORKING_HOURS.start + index,
);

const subscribe = () => () => {};

/** True in the browser after hydration: the live clocks are not part of the server HTML. */
function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

/** The converter with the city as its source: ?city=Madrid&tz=Europe/Madrid&cityId=…. */
function getConverterSearch(cityId: CityId) {
  const params = new URLSearchParams({
    city: translate('en', `cityNames.${cityId}`),
    tz: CITIES[cityId].timezone,
    cityId: CITIES[cityId].geonameId,
  });

  return `?${params.toString()}`;
}

/**
 * A time difference page: /{lang}/time-difference/{pair}. Its links are plain ones, like on the
 * other content pages: a new page starts at the top.
 */
export default function TimeDifferencePage() {
  const { pair: slug = '' } = useParams();
  const { language } = useI18n();
  const pair = getCityPair(slug);

  if (!pair) {
    const movedPagePath = getMovedPagePath(getTimeDifferencePath(slug));

    return movedPagePath
      ? (
          <Navigate
            replace
            to={getCanonicalLanguagePath(language, movedPagePath)}
          />
        )
      : <NotFoundPage />;
  }

  return <CityPairPage pair={pair} />;
}

function CityPairPage({ pair }: { pair: CityPair }) {
  const { language, t } = useI18n();
  const { timeFormat } = usePreferences();
  const now = useCurrentMinuteDate();
  const isClient = useIsClient();
  const [first, second] = pair.cities;
  const names = getPairCityNames(t, pair);
  const context: PairTextContext = {
    t,
    language,
    pair,
    now,
    formatTime: (date, timezone) => formatClockTime(date, timezone, timeFormat),
  };
  const year = now.getUTCFullYear();
  const periods = getDifferencePeriods(pair.cities, year);

  const formatDay = (date: Date, timezone: string) => (
    new Intl.DateTimeFormat(getIntlLocale(language), { day: 'numeric', month: 'long', timeZone: timezone }).format(date)
  );

  const firstTimezone = CITIES[first].timezone;
  const otherPairs = getCityPairs().filter((otherPair) => otherPair.slug !== pair.slug);

  return (
    <>
      <Seo />

      <Header />

      <main className="timeDifferencePage">
        <section className="section timeDifferenceHero">
          <div className="container timeDifferenceHero-container">
            <h1 className="timeDifferenceHero-title">{t('timeDifference.title', names)}</h1>
            <p className="timeDifferenceHero-statement">{getDifferenceSentence(context)}</p>

            <div className="timeDifferenceClocks">
              {pair.cities.map((cityId) => (
                <div
                  className="timeDifferenceClocks-item"
                  key={cityId}
                >
                  <span className="timeDifferenceClocks-city">{t(`cityNames.${cityId}`)}</span>
                  <span className="timeDifferenceClocks-time">
                    {isClient ? formatClockTime(now, CITIES[cityId].timezone, timeFormat) : ' '}
                  </span>
                </div>
              ))}
            </div>

            <p className="timeDifferenceHero-lead">{t('timeDifference.lead', names)}</p>
          </div>
        </section>

        <section className="section timeDifferenceChanges">
          <div className="container timeDifferenceChanges-container">
            <h2 className="section-title timeDifferenceSection-title">{t('timeDifference.changesTitle', { ...names, year })}</h2>
            <p className="timeDifferenceSection-lead">
              {getChangesSentence(context)}
              {' '}
              {periods.length > 1 && t('timeDifference.changesWhy')}
            </p>

            {periods.length > 1 && (
              <table className="timeDifferenceTable">
                <thead>
                  <tr>
                    <th scope="col">{t('timeDifference.columnPeriod', names)}</th>
                    <th scope="col">{t('timeDifference.columnDifference')}</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period, index) => {
                    const isCurrent = now >= period.start && now < period.end;
                    // The year's first and last day, whatever the time zone; the changes in the first city's dates.
                    const start = index === 0 ? formatDay(period.start, 'UTC') : formatDay(period.start, firstTimezone);
                    const end = index === periods.length - 1
                      ? formatDay(new Date(period.end.getTime() - 1), 'UTC')
                      : formatDay(period.end, firstTimezone);

                    return (
                      <tr
                        className={cx(isCurrent && 'isCurrent')}
                        key={period.start.getTime()}
                      >
                        <td>{t('timeDifference.periodRange', { start, end })}</td>
                        <td>
                          {period.minutes === 0
                            ? t('timeDifference.periodSame')
                            : t('timeDifference.periodDifference', {
                                ahead: period.minutes > 0 ? names.cityB : names.cityA,
                                difference: formatHours(language, period.minutes),
                              })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="section timeDifferenceHours">
          <div className="container timeDifferenceHours-container">
            <h2 className="section-title timeDifferenceSection-title">{t('timeDifference.hoursTitle', names)}</h2>
            <p className="timeDifferenceSection-lead">{t('timeDifference.hoursLead', names)}</p>

            <div className="timeDifferenceHours-tables">
              {[pair.cities, [second, first] as const].map(([from, to]) => (
                <table
                  className="timeDifferenceTable"
                  key={from}
                >
                  <thead>
                    <tr>
                      <th scope="col">{t(`cityNames.${from}`)}</th>
                      <th scope="col">{t(`cityNames.${to}`)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {WORKING_DAY_HOURS.map((hour) => {
                      const date = getHourToday(from, now, hour);
                      const dayMarker = getRelativeDayMarker(CITIES[to].timezone, CITIES[from].timezone, date);

                      return (
                        <tr key={hour}>
                          <th scope="row">{formatClockTime(date, CITIES[from].timezone, timeFormat)}</th>
                          <td>
                            {formatClockTime(date, CITIES[to].timezone, timeFormat)}
                            {dayMarker && (
                              <span className="timeDifferenceTable-day">
                                {t(dayMarker === 'tomorrow' ? 'cities.tomorrow' : 'cities.yesterday')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ))}
            </div>
          </div>
        </section>

        <section className="section timeDifferenceCall">
          <div className="container timeDifferenceCall-container">
            <h2 className="section-title timeDifferenceSection-title">{t('timeDifference.callTitle')}</h2>
            <p className="timeDifferenceSection-lead">{getCallSentence(context)}</p>
            <div className="timeDifferenceCall-links">
              <a
                className="button timeDifferenceCall-link"
                href={getCanonicalLanguagePath(language, PAGES.meetingTimePlanner.path)}
              >
                {t('timeDifference.plannerLink')}
              </a>
              <a
                className="button timeDifferenceCall-link"
                href={`${getCanonicalLanguagePath(language, PAGES.timeZoneConverter.path)}${getConverterSearch(first)}`}
              >
                {t('timeDifference.converterLink', { city: names.cityA })}
              </a>
            </div>
          </div>
        </section>

        <section className="section timeDifferenceFaq">
          <div className="container timeDifferenceFaq-container">
            <h2 className="section-title">{t('timeDifference.faqTitle', names)}</h2>
            <FAQ items={getTimeDifferenceFaq(context).map(({ id, title, text }) => ({
              id,
              title,
              content: <p className="accordion-para">{text}</p>,
            }))}
            />
          </div>
        </section>

        {otherPairs.length > 0 && (
          <section className="section timeDifferenceLinks">
            <div className="container timeDifferenceLinks-container">
              <h2 className="section-title">{t('timeDifference.otherTitle')}</h2>
              <ul className="timeDifferenceLinks-list">
                {otherPairs.map((otherPair) => (
                  <li key={otherPair.slug}>
                    <a
                      className="timeDifferenceLinks-link"
                      href={getCanonicalLanguagePath(language, getTimeDifferencePath(otherPair.slug))}
                    >
                      {t('timeDifference.pairLink', getPairCityNames(t, otherPair))}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
