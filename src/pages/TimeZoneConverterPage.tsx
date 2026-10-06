import './TimeZoneConverterPage.css';

import { Link } from 'react-router';

import AppDownloadCta from '../components/AppDownloadCta';
import ClientOnly from '../components/ClientOnly';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';
import Header from '../components/Header';
import Seo from '../components/Seo';
import TimeZoneConverter from '../components/TimeZoneConverter';
import { useI18n } from '../i18n';
import { getCanonicalLanguagePath } from '../i18n/languageRouting';
import type { ColorMode, TimeFormat } from '../settings';

type TimeZoneConverterPageProps = {
  colorMode: ColorMode;
  timeFormat: TimeFormat;
  onColorModeButtonClick: () => void;
  onTimeFormatButtonClick: () => void;
};

export default function TimeZoneConverterPage({
  colorMode,
  timeFormat,
  onColorModeButtonClick,
  onTimeFormatButtonClick,
}: TimeZoneConverterPageProps) {
  const { language, t } = useI18n();

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
