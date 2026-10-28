import './MeetingTimePlannerPage.css';

import AppDownloadCta from '../components/AppDownloadCta';
import ClientOnly from '../components/ClientOnly';
import Footer from '../components/Footer';
import Header from '../components/Header';
import Seo from '../components/Seo';
import Timelines from '../components/Timelines';
import { useI18n } from '../i18n';
import { getCanonicalLanguagePath } from '../i18n/languageRouting';
import type { ColorMode, TimeFormat } from '../settings';

type MeetingTimePlannerPageProps = {
  colorMode: ColorMode;
  timeFormat: TimeFormat;
  onColorModeButtonClick: () => void;
  onTimeFormatButtonClick: () => void;
};

export default function MeetingTimePlannerPage({
  colorMode,
  timeFormat,
  onColorModeButtonClick,
  onTimeFormatButtonClick,
}: MeetingTimePlannerPageProps) {
  const { language, t } = useI18n();

  return (
    <>
      <Seo page="meetingTimePlanner" />

      <Header
        colorMode={colorMode}
        timeFormat={timeFormat}
        onColorModeButtonClick={onColorModeButtonClick}
        onTimeFormatButtonClick={onTimeFormatButtonClick}
      />

      <main className="meetingTimePlannerPage">
        <section className="section meetingTimePlannerHero">
          <h1 className="meetingTimePlannerHero-title">{t('meetingTimePlanner.title')}</h1>
        </section>

        <section className="section meetingTimePlannerWidgetSection">
          <div className="meetingTimePlannerWidgetSection-widget">
            <ClientOnly>
              <Timelines colorMode={colorMode} timeFormat={timeFormat} syncUrl
                onColorModeButtonClick={onColorModeButtonClick} onTimeFormatButtonClick={onTimeFormatButtonClick} />
            </ClientOnly>
          </div>
          <div className="container meetingTimePlannerWidgetSection-container">
            <p className="meetingTimePlannerHero-lead">{t('meetingTimePlanner.lead')}</p>
            <p className="meetingTimePlannerHero-description">
              {t('meetingTimePlanner.description')}
            </p>
            <AppDownloadCta className="meetingTimePlannerHero-cta" />
            <h2 className="section-title">{t('meetingTimePlanner.previewTitle')}</h2>
            <p className="meetingTimePlannerWidgetSection-text">
              {t('meetingTimePlanner.previewText')}
            </p>
          </div>
        </section>

        <section className="section meetingTimePlannerInfo">
          <div className="container meetingTimePlannerInfo-container">
            <section className="meetingTimePlannerInfo-block">
              <h2 className="meetingTimePlannerInfo-title">
                {t('meetingTimePlanner.compareTitle')}
              </h2>
              <p className="meetingTimePlannerInfo-text">{t('meetingTimePlanner.compareText')}</p>
            </section>

            <section className="meetingTimePlannerInfo-block">
              <h2 className="meetingTimePlannerInfo-title">
                {t('meetingTimePlanner.planTitle')}
              </h2>
              <p className="meetingTimePlannerInfo-text">{t('meetingTimePlanner.planText')}</p>
            </section>
          </div>
        </section>

        <section className="section meetingTimePlannerLinks">
          <div className="container meetingTimePlannerLinks-container">
            <h2 className="section-title">{t('meetingTimePlanner.nextTitle')}</h2>
            <div className="meetingTimePlannerLinks-list">
              <a
                className="meetingTimePlannerLinks-link"
                href={getCanonicalLanguagePath(language, '/world-clock')}
              >
                {t('meetingTimePlanner.worldClockLink')}
              </a>
              <a
                className="meetingTimePlannerLinks-link"
                href={getCanonicalLanguagePath(language, '/time-zone-converter')}
              >
                {t('timeZoneConverter.converterLink')}
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
