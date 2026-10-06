import './TimeZoneConverterPage.css';

import { Link } from 'react-router';

import AppDownloadCta from '../components/AppDownloadCta';
import ClientOnly from '../components/ClientOnly';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';
import Header from '../components/Header';
import Seo from '../components/Seo';
import TimeZoneConverter from '../components/TimeZoneConverter';
import {
  formatTime,
  getRelativeDayMarker,
  getUtcDateForZonedTime,
  getZonedDateParts,
} from '../components/Timelines/utils';
import { useI18n } from '../i18n';
import { getCanonicalLanguagePath } from '../i18n/languageRouting';
import type { ColorMode, TimeFormat } from '../settings';

type TimeZoneConverterPageProps = {
  colorMode: ColorMode;
  timeFormat: TimeFormat;
  onColorModeButtonClick: () => void;
  onTimeFormatButtonClick: () => void;
};

const converterExampleIds = [
  'newYork',
  'london',
  'paris',
  'dubai',
  'singapore',
  'tokyo',
  'losAngeles',
] as const;

type ConverterExampleCityId = typeof converterExampleIds[number];

const converterExampleCities: Record<ConverterExampleCityId, { timezone: string }> = {
  newYork: { timezone: 'America/New_York' },
  london: { timezone: 'Europe/London' },
  paris: { timezone: 'Europe/Paris' },
  dubai: { timezone: 'Asia/Dubai' },
  singapore: { timezone: 'Asia/Singapore' },
  tokyo: { timezone: 'Asia/Tokyo' },
  losAngeles: { timezone: 'America/Los_Angeles' },
};

const converterExampleTargets: Record<ConverterExampleCityId, ConverterExampleCityId[]> = {
  newYork: ['losAngeles', 'london', 'dubai', 'tokyo'],
  london: ['newYork', 'paris', 'dubai', 'tokyo'],
  paris: ['london', 'newYork', 'dubai', 'tokyo'],
  dubai: ['london', 'paris', 'singapore', 'losAngeles'],
  singapore: ['tokyo', 'dubai', 'paris', 'newYork'],
  tokyo: ['singapore', 'dubai', 'london', 'losAngeles'],
  losAngeles: ['newYork', 'london', 'dubai', 'tokyo'],
};

function getConverterExampleDate(timezone: string, baseDate: Date) {
  const todayParts = getZonedDateParts(timezone, baseDate);

  return getUtcDateForZonedTime(timezone, {
    ...todayParts,
    hour: 10,
    minute: 0,
    second: 0,
  });
}

export default function TimeZoneConverterPage({
  colorMode,
  timeFormat,
  onColorModeButtonClick,
  onTimeFormatButtonClick,
}: TimeZoneConverterPageProps) {
  const { language, t } = useI18n();
  const converterExamplesBaseDate = new Date();

  return (
    <>
      <Seo page="timeZoneConverter" />

      <Header
        colorMode={colorMode}
        timeFormat={timeFormat}
        onColorModeButtonClick={onColorModeButtonClick}
        onTimeFormatButtonClick={onTimeFormatButtonClick}
      />

      <main className="timeZoneConverterPage">
        <section className="section timeZoneConverterHero">
          <div className="container timeZoneConverterHero-container">
            <div className="timeZoneConverterHero-text">
              <h1 className="timeZoneConverterHero-title">{t('timeZoneConverter.title')}</h1>
              <p className="timeZoneConverterHero-lead">{t('timeZoneConverter.lead')}</p>
            </div>
          </div>
        </section>

        <section className="section timeZoneConverterToolSection">
          <div className="container timeZoneConverterToolSection-container">
            <h2 className="section-title timeZoneConverterToolSection-title">
              {t('timeZoneConverter.toolTitle')}
            </h2>
            <p className="timeZoneConverterToolSection-text">
              {t('timeZoneConverter.toolText')}
            </p>
            <div className="timeZoneConverterToolSection-widget">
              <ClientOnly>
                <TimeZoneConverter timeFormat={timeFormat} />
              </ClientOnly>
            </div>
            <p className="timeZoneConverterToolSection-description">
              {t('timeZoneConverter.description')}
            </p>
            <AppDownloadCta className="timeZoneConverterToolSection-cta" />
          </div>
        </section>

        <section className="section timeZoneConverterInfo">
          <div className="container timeZoneConverterInfo-container">
            <section className="timeZoneConverterInfo-block">
              <h2 className="timeZoneConverterInfo-title">
                {t('timeZoneConverter.convertTitle')}
              </h2>
              <p className="timeZoneConverterInfo-text">{t('timeZoneConverter.convertText')}</p>
            </section>

            <section className="timeZoneConverterInfo-block">
              <h2 className="timeZoneConverterInfo-title">
                {t('timeZoneConverter.contextTitle')}
              </h2>
              <p className="timeZoneConverterInfo-text">{t('timeZoneConverter.contextText')}</p>
            </section>
          </div>
        </section>

        <section className="section timeZoneConverterUseCases">
          <div className="container timeZoneConverterUseCases-container">
            <h2 className="section-title">{t('timeZoneConverter.useCasesTitle')}</h2>
            <p className="timeZoneConverterUseCases-lead">{t('timeZoneConverter.useCasesLead')}</p>
            <div className="timeZoneConverterUseCases-list">
              <article className="timeZoneConverterUseCases-item">
                <h3 className="timeZoneConverterUseCases-title">
                  {t('timeZoneConverter.useCases.cityToCity.title')}
                </h3>
                <p className="timeZoneConverterUseCases-text">
                  {t('timeZoneConverter.useCases.cityToCity.text')}
                </p>
              </article>

              <article className="timeZoneConverterUseCases-item">
                <h3 className="timeZoneConverterUseCases-title">
                  {t('timeZoneConverter.useCases.utc.title')}
                </h3>
                <p className="timeZoneConverterUseCases-text">
                  {t('timeZoneConverter.useCases.utc.text')}
                </p>
              </article>

              <article className="timeZoneConverterUseCases-item">
                <h3 className="timeZoneConverterUseCases-title">
                  {t('timeZoneConverter.useCases.meeting.title')}
                </h3>
                <p className="timeZoneConverterUseCases-text">
                  {t('timeZoneConverter.useCases.meeting.text')}
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section timeZoneConverterExamples">
          <div className="container timeZoneConverterExamples-container">
            <h2 className="section-title">{t('timeZoneConverter.examplesTitle')}</h2>
            <p className="timeZoneConverterExamples-lead">{t('timeZoneConverter.examplesLead')}</p>
            <div className="timeZoneConverterExamples-list">
              {converterExampleIds.map((exampleId) => {
                const exampleCity = converterExampleCities[exampleId];
                const exampleDate = getConverterExampleDate(
                  exampleCity.timezone,
                  converterExamplesBaseDate,
                );
                const exampleCityName = t(`timeZoneConverter.exampleCityNames.${exampleId}`);

                return (
                  <article className="timeZoneConverterExamples-item" key={exampleId}>
                    <h3 className="timeZoneConverterExamples-title">
                      {t(`timeZoneConverter.examples.${exampleId}.title`)}
                    </h3>
                    <p className="timeZoneConverterExamples-source">
                      {t('timeZoneConverter.exampleSource', {
                        city: exampleCityName,
                        time: formatTime(exampleDate, exampleCity.timezone, timeFormat),
                      })}
                    </p>
                    <ul className="timeZoneConverterExamples-results">
                      {converterExampleTargets[exampleId].map((targetId) => {
                        const targetCity = converterExampleCities[targetId];
                        const dayMarker = getRelativeDayMarker(
                          targetCity.timezone,
                          exampleCity.timezone,
                          exampleDate,
                        );
                        const resultKey = dayMarker
                          ? `timeZoneConverter.exampleResult.${dayMarker}`
                          : 'timeZoneConverter.exampleResult.same';

                        return (
                          <li className="timeZoneConverterExamples-result" key={targetId}>
                            {t(resultKey, {
                              city: t(`timeZoneConverter.exampleCityNames.${targetId}`),
                              time: formatTime(exampleDate, targetCity.timezone, timeFormat),
                            })}
                          </li>
                        );
                      })}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section timeZoneConverterFaq">
          <div className="container timeZoneConverterFaq-container">
            <h2 className="section-title">{t('timeZoneConverter.faqTitle')}</h2>
            <FAQ
              items={[
                {
                  id: 'what',
                  title: t('timeZoneConverter.faq.what.title'),
                  content: (
                    <p className="accordion-para">{t('timeZoneConverter.faq.what.text')}</p>
                  ),
                },
                {
                  id: 'dst',
                  title: t('timeZoneConverter.faq.dst.title'),
                  content: (
                    <p className="accordion-para">{t('timeZoneConverter.faq.dst.text')}</p>
                  ),
                },
                {
                  id: 'cities',
                  title: t('timeZoneConverter.faq.cities.title'),
                  content: (
                    <p className="accordion-para">{t('timeZoneConverter.faq.cities.text')}</p>
                  ),
                },
                {
                  id: 'offsets',
                  title: t('timeZoneConverter.faq.offsets.title'),
                  content: (
                    <p className="accordion-para">{t('timeZoneConverter.faq.offsets.text')}</p>
                  ),
                },
              ]}
            />
          </div>
        </section>

        <section className="section timeZoneConverterLinks">
          <div className="container timeZoneConverterLinks-container">
            <h2 className="section-title">{t('timeZoneConverter.nextTitle')}</h2>
            <div className="timeZoneConverterLinks-list">
              <Link
                className="timeZoneConverterLinks-link"
                to={getCanonicalLanguagePath(language, '/world-clock')}
              >
                {t('timeZoneConverter.worldClockLink')}
              </Link>
              <Link
                className="timeZoneConverterLinks-link"
                to={getCanonicalLanguagePath(language, '/meeting-time-planner')}
              >
                {t('timeZoneConverter.meetingPlannerLink')}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
