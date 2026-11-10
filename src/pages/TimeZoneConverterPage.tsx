import './TimeZoneConverterPage.css';

import AppDownloadCta from '../components/AppDownloadCta';
import ClientOnly from '../components/ClientOnly';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { TimeZoneConverter } from '../components/lazyWidgets';
import Seo from '../components/Seo';
import { usePreferences } from '../hooks/usePreferences';
import { useI18n, type TranslationKey } from '../i18n';
import { getCanonicalLanguagePath } from '../i18n/languageRouting';
import { PAGES } from '../routes';
import { formatClockTime, getRelativeDayMarker } from '../utils/time';

import { getEnabledExamples, getExampleDate } from './converterExamples';

const converterExamples = getEnabledExamples();

export default function TimeZoneConverterPage() {
  const { language, t } = useI18n();
  const { timeFormat } = usePreferences();
  const examplesBaseDate = new Date();

  return (
    <>
      <Seo />

      <Header />

      <main className="timeZoneConverterPage">
        <section className="section timeZoneConverterHero">
          <h1 className="timeZoneConverterHero-title">{t('timeZoneConverter.title')}</h1>
        </section>

        <section className="section timeZoneConverterToolSection">
          <div className="container timeZoneConverterToolSection-container">
            <div className="timeZoneConverterToolSection-widget">
              <ClientOnly>
                <TimeZoneConverter syncUrl />
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

        {converterExamples.regions.length > 0 && (
          <section className="section timeZoneConverterExamples">
            <div className="container timeZoneConverterExamples-container">
              <h2 className="section-title">{t('timeZoneConverter.examplesTitle')}</h2>
              <p className="timeZoneConverterExamples-lead">{t('timeZoneConverter.examplesLead')}</p>
              <div className="timeZoneConverterExamples-groups">
                {converterExamples.regions.map((region) => (
                  <section
                    className="timeZoneConverterExamples-group"
                    key={region.id}
                  >
                    <h3 className="timeZoneConverterExamples-groupTitle">
                      {t(`timeZoneConverter.exampleGroups.${region.id}`)}
                    </h3>

                    <div className="timeZoneConverterExamples-list">
                      {region.cities.map((city) => {
                        const cityName = t(`timeZoneConverter.exampleCityNames.${city.id}`);

                        return (
                          <article
                            className="timeZoneConverterExamples-item"
                            key={city.id}
                          >
                            <h4 className="timeZoneConverterExamples-title">
                              {t('timeZoneConverter.exampleTitle', { city: cityName })}
                            </h4>

                            <div className="timeZoneConverterExamples-hours">
                              {converterExamples.hours.map((hour) => {
                                const exampleDate = getExampleDate(city.timezone, examplesBaseDate, hour);

                                return (
                                  <section
                                    className="timeZoneConverterExamples-hour"
                                    key={hour}
                                  >
                                    <p className="timeZoneConverterExamples-source">
                                      {t('timeZoneConverter.exampleSource', {
                                        city: cityName,
                                        time: formatClockTime(exampleDate, city.timezone, timeFormat),
                                      })}
                                    </p>
                                    <ul className="timeZoneConverterExamples-results">
                                      {city.targets.map((target) => {
                                        const dayMarker = getRelativeDayMarker(
                                          target.timezone,
                                          city.timezone,
                                          exampleDate,
                                        );
                                        const resultKey: TranslationKey = dayMarker
                                          ? `timeZoneConverter.exampleResult.${dayMarker}`
                                          : 'timeZoneConverter.exampleResult.same';

                                        return (
                                          <li
                                            className="timeZoneConverterExamples-result"
                                            key={target.id}
                                          >
                                            {t(resultKey, {
                                              city: t(`timeZoneConverter.exampleCityNames.${target.id}`),
                                              time: formatClockTime(exampleDate, target.timezone, timeFormat),
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
        )}

        <section className="section timeZoneConverterFaq">
          <div className="container timeZoneConverterFaq-container">
            <h2 className="section-title">{t('timeZoneConverter.faqTitle')}</h2>
            <FAQ items={[
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
                href={getCanonicalLanguagePath(language, PAGES.worldClock.path)}
              >
                {t('timeZoneConverter.worldClockLink')}
              </a>
              <a
                className="timeZoneConverterLinks-link"
                href={getCanonicalLanguagePath(language, PAGES.meetingTimePlanner.path)}
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
