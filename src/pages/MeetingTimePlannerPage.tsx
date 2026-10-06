import './MeetingTimePlannerPage.css';

import { Link } from 'react-router';

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
          <div className="container meetingTimePlannerHero-container">
            <div className="meetingTimePlannerHero-text">
              <h1 className="meetingTimePlannerHero-title">{t('meetingTimePlanner.title')}</h1>
              <p className="meetingTimePlannerHero-lead">{t('meetingTimePlanner.lead')}</p>
              <p className="meetingTimePlannerHero-description">
                {t('meetingTimePlanner.description')}
              </p>
              <AppDownloadCta className="meetingTimePlannerHero-cta" />
            </div>
          </div>
        </section>

        <section className="section meetingTimePlannerWidgetSection">
          <div className="container meetingTimePlannerWidgetSection-container">
            <h2 className="section-title">{t('meetingTimePlanner.previewTitle')}</h2>
            <p className="meetingTimePlannerWidgetSection-text">
              {t('meetingTimePlanner.previewText')}
            </p>
          </div>

          <ClientOnly>
            <Timelines timeFormat={timeFormat} />
          </ClientOnly>
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
              <Link
                className="meetingTimePlannerLinks-link"
                to={getCanonicalLanguagePath(language, '/grid')}
              >
                {t('meetingTimePlanner.gridLink')}
              </Link>
              <Link
                className="meetingTimePlannerLinks-link"
                to={getCanonicalLanguagePath(language, '/world-clock')}
              >
                {t('meetingTimePlanner.worldClockLink')}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
