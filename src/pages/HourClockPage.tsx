import './HourClockPage.css';

import { useId, useState, useSyncExternalStore } from 'react';

import FAQ from '../components/FAQ';
import Footer from '../components/Footer';
import Header from '../components/Header';
import Seo from '../components/Seo';
import { useCurrentMinuteDate } from '../hooks/useCurrentMinuteDate';
import { useI18n } from '../i18n';
import { getCanonicalLanguagePath } from '../i18n/languageRouting';
import { PAGES } from '../routes';
import { cx } from '../utils/classNames';

import {
  HOURS,
  INITIAL_CLOCK_INPUT,
  format24h,
  get12hParts,
  parseClockInput,
  type ClockTime,
  type Hour,
} from './hourClock';

const TABLE_HALVES = [HOURS.slice(0, 12), HOURS.slice(12)] as const;

const FAQ_IDS = ['midnight', 'noon', 'convert', 'military'] as const;

const subscribe = () => () => {};

/**
 * The visitor's current hour. Only the browser knows it: the server and the hydration pass render
 * the table without a highlighted row.
 */
function useCurrentHour() {
  const currentDate = useCurrentMinuteDate();
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);

  return isClient ? currentDate.getHours() : null;
}

export default function HourClockPage() {
  const { language, t } = useI18n();
  const inputId = useId();
  const [input, setInput] = useState(INITIAL_CLOCK_INPUT);
  const currentHour = useCurrentHour();
  const time = parseClockInput(input);

  // AM/PM in the language's spelling ("p. m." in Spanish): what people search for on this page.
  // Non-breaking spaces keep "4:00 p. m." on one line.
  const format12h = (clockTime: ClockTime) => {
    const { time: clock, period } = get12hParts(clockTime);

    return `${clock} ${t(`hourClock.${period}`)}`.replaceAll(' ', '\u00a0');
  };

  const getSpokenHour = (hour: Hour) => t(`hourClock.spoken.${hour}`);

  return (
    <>
      <Seo />

      <Header />

      <main className="hourClockPage">
        <section className="section hourClockHero">
          <div className="container hourClockHero-container">
            <h1 className="hourClockHero-title">{t('hourClock.title')}</h1>
            <p className="hourClockHero-lead">{t('hourClock.lead')}</p>

            <div className="hourClockConverter">
              <label
                className="hourClockConverter-label"
                htmlFor={inputId}
              >
                {t('hourClock.inputLabel')}
              </label>
              <input
                id={inputId}
                className="input hourClockConverter-input"
                type="text"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={t('hourClock.inputPlaceholder')}
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <output
                className="hourClockConverter-result"
                htmlFor={inputId}
                aria-live="polite"
              >
                {time
                  ? (
                      <>
                        <span className="hourClockConverter-times">
                          {format24h(time)}
                          {' = '}
                          {format12h(time)}
                        </span>
                        {time.minute === 0 && (
                          <span className="hourClockConverter-spoken">{getSpokenHour(time.hour)}</span>
                        )}
                      </>
                    )
                  : (
                      <span className="hourClockConverter-error">
                        {input.trim() ? t('hourClock.inputInvalid') : t('hourClock.inputEmpty')}
                      </span>
                    )}
              </output>
            </div>
          </div>
        </section>

        <section className="section hourClockTable">
          <div className="container hourClockTable-container">
            <h2 className="section-title hourClockTable-title">{t('hourClock.tableTitle')}</h2>
            <p className="hourClockTable-lead">{t('hourClock.tableLead')}</p>

            <div className="hourClockTable-halves">
              {TABLE_HALVES.map((hours, index) => (
                <table
                  className="hourClockTable-table"
                  key={hours[0]}
                >
                  <caption className="hourClockTable-caption">
                    {t(index === 0 ? 'hourClock.firstHalf' : 'hourClock.secondHalf')}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">{t('hourClock.column24h')}</th>
                      <th scope="col">{t('hourClock.column12h')}</th>
                      <th scope="col">{t('hourClock.columnSpoken')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hours.map((hour) => {
                      const clockTime = { hour, minute: 0 };
                      const isCurrent = hour === currentHour;

                      return (
                        <tr
                          className={cx('hourClockTable-row', isCurrent && 'isCurrent')}
                          id={String(hour).padStart(2, '0')}
                          key={hour}
                          aria-current={isCurrent ? 'time' : undefined}
                        >
                          <th scope="row">{format24h(clockTime)}</th>
                          <td>{format12h(clockTime)}</td>
                          <td>{getSpokenHour(hour)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ))}
            </div>
          </div>
        </section>

        <section className="section hourClockInfo">
          <div className="container hourClockInfo-container">
            <section className="hourClockInfo-block">
              <h2 className="hourClockInfo-title">{t('hourClock.howTitle')}</h2>
              <p className="hourClockInfo-text">{t('hourClock.howText')}</p>
            </section>

            <section className="hourClockInfo-block">
              <h2 className="hourClockInfo-title">{t('hourClock.zonesTitle')}</h2>
              <p className="hourClockInfo-text">{t('hourClock.zonesText')}</p>
              <a
                className="button hourClockInfo-link"
                href={getCanonicalLanguagePath(language, PAGES.timeZoneConverter.path)}
              >
                {t('hourClock.zonesLink')}
              </a>
            </section>
          </div>
        </section>

        <section className="section hourClockFaq">
          <div className="container hourClockFaq-container">
            <h2 className="section-title">{t('hourClock.faqTitle')}</h2>
            <FAQ items={FAQ_IDS.map((id) => ({
              id,
              title: t(`hourClock.faq.${id}.title`),
              content: <p className="accordion-para">{t(`hourClock.faq.${id}.text`)}</p>,
            }))}
            />
          </div>
        </section>

        <section className="section hourClockLinks">
          <div className="container hourClockLinks-container">
            <h2 className="section-title">{t('hourClock.nextTitle')}</h2>
            <div className="hourClockLinks-list">
              <a
                className="hourClockLinks-link"
                href={getCanonicalLanguagePath(language, PAGES.timeZoneConverter.path)}
              >
                {t('common.timeZoneConverterLabel')}
              </a>
              <a
                className="hourClockLinks-link"
                href={getCanonicalLanguagePath(language, PAGES.worldClock.path)}
              >
                {t('common.worldClockLabel')}
              </a>
              <a
                className="hourClockLinks-link"
                href={getCanonicalLanguagePath(language, PAGES.meetingTimePlanner.path)}
              >
                {t('common.meetingPlannerLabel')}
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
