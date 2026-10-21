import './TimeZoneConverterPage.css';

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

const converterExampleGroups = [
  {
    id: 'northAmerica',
    examples: ['newYork', 'losAngeles', 'chicago', 'denver', 'toronto', 'vancouver'],
  },
  {
    id: 'europe',
    examples: ['london', 'paris', 'berlin', 'madrid', 'amsterdam', 'zurich'],
  },
  {
    id: 'asia',
    examples: ['tokyo', 'singapore', 'hongKong', 'seoul', 'mumbai', 'bangkok'],
  },
  {
    id: 'middleEastAfrica',
    examples: ['dubai', 'istanbul', 'cairo', 'johannesburg', 'riyadh', 'doha'],
  },
  {
    id: 'latinAmerica',
    examples: ['mexicoCity', 'saoPaulo', 'buenosAires', 'santiago', 'bogota', 'lima'],
  },
  {
    id: 'oceania',
    examples: ['sydney', 'melbourne', 'auckland', 'honolulu', 'suva', 'perth'],
  },
] as const;

const converterExampleIds = converterExampleGroups.flatMap((group) => group.examples);

type ConverterExampleCityId = typeof converterExampleIds[number];

const converterBusinessHours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const;

const converterExampleCities: Record<ConverterExampleCityId, { timezone: string }> = {
  newYork: { timezone: 'America/New_York' },
  losAngeles: { timezone: 'America/Los_Angeles' },
  chicago: { timezone: 'America/Chicago' },
  denver: { timezone: 'America/Denver' },
  toronto: { timezone: 'America/Toronto' },
  vancouver: { timezone: 'America/Vancouver' },
  london: { timezone: 'Europe/London' },
  paris: { timezone: 'Europe/Paris' },
  berlin: { timezone: 'Europe/Berlin' },
  madrid: { timezone: 'Europe/Madrid' },
  amsterdam: { timezone: 'Europe/Amsterdam' },
  zurich: { timezone: 'Europe/Zurich' },
  tokyo: { timezone: 'Asia/Tokyo' },
  singapore: { timezone: 'Asia/Singapore' },
  hongKong: { timezone: 'Asia/Hong_Kong' },
  seoul: { timezone: 'Asia/Seoul' },
  mumbai: { timezone: 'Asia/Kolkata' },
  bangkok: { timezone: 'Asia/Bangkok' },
  dubai: { timezone: 'Asia/Dubai' },
  istanbul: { timezone: 'Europe/Istanbul' },
  cairo: { timezone: 'Africa/Cairo' },
  johannesburg: { timezone: 'Africa/Johannesburg' },
  riyadh: { timezone: 'Asia/Riyadh' },
  doha: { timezone: 'Asia/Qatar' },
  mexicoCity: { timezone: 'America/Mexico_City' },
  saoPaulo: { timezone: 'America/Sao_Paulo' },
  buenosAires: { timezone: 'America/Argentina/Buenos_Aires' },
  santiago: { timezone: 'America/Santiago' },
  bogota: { timezone: 'America/Bogota' },
  lima: { timezone: 'America/Lima' },
  sydney: { timezone: 'Australia/Sydney' },
  melbourne: { timezone: 'Australia/Melbourne' },
  auckland: { timezone: 'Pacific/Auckland' },
  honolulu: { timezone: 'Pacific/Honolulu' },
  suva: { timezone: 'Pacific/Fiji' },
  perth: { timezone: 'Australia/Perth' },
};

const converterExampleTargets: Record<ConverterExampleCityId, ConverterExampleCityId[]> = {
  newYork: ['losAngeles', 'london', 'paris', 'dubai', 'tokyo'],
  losAngeles: ['newYork', 'chicago', 'london', 'singapore', 'sydney'],
  chicago: ['newYork', 'denver', 'losAngeles', 'london', 'tokyo'],
  denver: ['chicago', 'losAngeles', 'newYork', 'paris', 'dubai'],
  toronto: ['vancouver', 'newYork', 'london', 'dubai', 'tokyo'],
  vancouver: ['toronto', 'losAngeles', 'tokyo', 'sydney', 'london'],
  london: ['newYork', 'paris', 'dubai', 'tokyo', 'sydney'],
  paris: ['london', 'newYork', 'dubai', 'singapore', 'losAngeles'],
  berlin: ['london', 'paris', 'newYork', 'singapore', 'tokyo'],
  madrid: ['london', 'paris', 'buenosAires', 'newYork', 'tokyo'],
  amsterdam: ['london', 'newYork', 'dubai', 'sydney', 'singapore'],
  zurich: ['london', 'paris', 'singapore', 'losAngeles', 'tokyo'],
  tokyo: ['singapore', 'seoul', 'london', 'losAngeles', 'newYork'],
  singapore: ['tokyo', 'hongKong', 'dubai', 'london', 'newYork'],
  hongKong: ['singapore', 'tokyo', 'london', 'sydney', 'vancouver'],
  seoul: ['tokyo', 'singapore', 'paris', 'newYork', 'losAngeles'],
  mumbai: ['dubai', 'singapore', 'london', 'berlin', 'newYork'],
  bangkok: ['singapore', 'hongKong', 'dubai', 'berlin', 'sydney'],
  dubai: ['london', 'mumbai', 'singapore', 'losAngeles', 'sydney'],
  istanbul: ['london', 'berlin', 'dubai', 'newYork', 'tokyo'],
  cairo: ['paris', 'istanbul', 'riyadh', 'toronto', 'mumbai'],
  johannesburg: ['london', 'dubai', 'sydney', 'singapore', 'newYork'],
  riyadh: ['dubai', 'doha', 'mumbai', 'london', 'newYork'],
  doha: ['dubai', 'riyadh', 'london', 'singapore', 'toronto'],
  mexicoCity: ['newYork', 'losAngeles', 'chicago', 'madrid', 'tokyo'],
  saoPaulo: ['london', 'newYork', 'paris', 'mexicoCity', 'tokyo'],
  buenosAires: ['madrid', 'saoPaulo', 'newYork', 'paris', 'london'],
  santiago: ['newYork', 'lima', 'bogota', 'london', 'sydney'],
  bogota: ['mexicoCity', 'newYork', 'lima', 'madrid', 'losAngeles'],
  lima: ['bogota', 'santiago', 'mexicoCity', 'losAngeles', 'madrid'],
  sydney: ['auckland', 'melbourne', 'singapore', 'london', 'losAngeles'],
  melbourne: ['sydney', 'perth', 'tokyo', 'dubai', 'london'],
  auckland: ['sydney', 'honolulu', 'tokyo', 'london', 'losAngeles'],
  honolulu: ['losAngeles', 'tokyo', 'auckland', 'vancouver', 'sydney'],
  suva: ['sydney', 'auckland', 'honolulu', 'losAngeles', 'singapore'],
  perth: ['singapore', 'melbourne', 'sydney', 'dubai', 'london'],
};

function getConverterExampleDate(timezone: string, baseDate: Date, hour: number) {
  const todayParts = getZonedDateParts(timezone, baseDate);

  return getUtcDateForZonedTime(timezone, {
    ...todayParts,
    hour,
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
          <h1 className="timeZoneConverterHero-title">{t('timeZoneConverter.title')}</h1>
        </section>

        <section className="section timeZoneConverterToolSection">
          <div className="container timeZoneConverterToolSection-container">
            <div className="timeZoneConverterToolSection-widget">
              <ClientOnly>
                <TimeZoneConverter timeFormat={timeFormat} syncUrl />
              </ClientOnly>
            </div>
            <p className="timeZoneConverterHero-lead">{t('timeZoneConverter.lead')}</p>
            <h2 className="section-title timeZoneConverterToolSection-title">
              {t('timeZoneConverter.toolTitle')}
            </h2>
            <p className="timeZoneConverterToolSection-text">
              {t('timeZoneConverter.toolText')}
            </p>
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
            <div className="timeZoneConverterExamples-groups">
              {converterExampleGroups.map((group) => (
                <section className="timeZoneConverterExamples-group" key={group.id}>
                  <h3 className="timeZoneConverterExamples-groupTitle">
                    {t(`timeZoneConverter.exampleGroups.${group.id}`)}
                  </h3>

                  <div className="timeZoneConverterExamples-list">
                    {group.examples.map((exampleId) => {
                      const exampleCity = converterExampleCities[exampleId];
                      const exampleCityName = t(`timeZoneConverter.exampleCityNames.${exampleId}`);

                      return (
                        <article className="timeZoneConverterExamples-item" key={exampleId}>
                          <h4 className="timeZoneConverterExamples-title">
                            {t('timeZoneConverter.exampleTitle', {
                              city: exampleCityName,
                            })}
                          </h4>

                          <div className="timeZoneConverterExamples-hours">
                            {converterBusinessHours.map((hour) => {
                              const exampleDate = getConverterExampleDate(
                                exampleCity.timezone,
                                converterExamplesBaseDate,
                                hour,
                              );

                              return (
                                <section className="timeZoneConverterExamples-hour" key={hour}>
                                  <p className="timeZoneConverterExamples-source">
                                    {t('timeZoneConverter.exampleSource', {
                                      city: exampleCityName,
                                      time: formatTime(
                                        exampleDate,
                                        exampleCity.timezone,
                                        timeFormat,
                                      ),
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
                                        <li
                                          className="timeZoneConverterExamples-result"
                                          key={targetId}
                                        >
                                          {t(resultKey, {
                                            city: t(
                                              `timeZoneConverter.exampleCityNames.${targetId}`,
                                            ),
                                            time: formatTime(
                                              exampleDate,
                                              targetCity.timezone,
                                              timeFormat,
                                            ),
                                          })}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </section>
                              );
                            })}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
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
              <a
                className="timeZoneConverterLinks-link"
                href={getCanonicalLanguagePath(language, '/world-clock')}
              >
                {t('timeZoneConverter.worldClockLink')}
              </a>
              <a
                className="timeZoneConverterLinks-link"
                href={getCanonicalLanguagePath(language, '/meeting-time-planner')}
              >
                {t('timeZoneConverter.meetingPlannerLink')}
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
