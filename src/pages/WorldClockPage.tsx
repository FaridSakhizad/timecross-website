import './WorldClockPage.css';

import AppDownloadCta from '../components/AppDownloadCta';
import ClientOnly from '../components/ClientOnly';
import { Cities } from '../components/lazyWidgets';
import Footer from '../components/Footer';
import Header from '../components/Header';
import Seo from '../components/Seo';
import { useI18n } from '../i18n';
import { getCanonicalLanguagePath } from '../i18n/languageRouting';
import { PAGES } from '../routes';

export default function WorldClockPage() {
  const { language, t } = useI18n();

  return (
    <>
      <Seo />

      <Header />

      <main className="worldClockPage">
        <section className="section worldClockHero">
          <h1 className="worldClockHero-title">{t('worldClock.title')}</h1>
        </section>

        <section className="section worldClockWidgetSection">
          <ClientOnly>
            <Cities customClassNames="worldClockCities" />
          </ClientOnly>
        </section>

        <section className="section worldClockOverview">
          <p className="worldClockHero-lead">{t('worldClock.lead')}</p>
          <p className="worldClockHero-description">{t('worldClock.description')}</p>
          <AppDownloadCta className="worldClockHero-cta" />
        </section>

        <section className="section worldClockInfo">
          <div className="container worldClockInfo-container">
            <section className="worldClockInfo-block">
              <h2 className="worldClockInfo-title">{t('worldClock.personalClockTitle')}</h2>
              <p className="worldClockInfo-text">{t('worldClock.personalClockText')}</p>
            </section>

            <section className="worldClockInfo-block">
              <h2 className="worldClockInfo-title">{t('worldClock.compareCitiesTitle')}</h2>
              <p className="worldClockInfo-text">{t('worldClock.compareCitiesText')}</p>
            </section>
          </div>
        </section>

        <section className="section worldClockLinks">
          <div className="container worldClockLinks-container">
            <h2 className="section-title">{t('worldClock.nextTitle')}</h2>
            <div className="worldClockLinks-list">
              <a
                className="worldClockLinks-link"
                href={getCanonicalLanguagePath(language, PAGES.meetingTimePlanner.path)}
              >
                {t('timeZoneConverter.meetingPlannerLink')}
              </a>
              <a
                className="worldClockLinks-link"
                href={getCanonicalLanguagePath(language, PAGES.timeZoneConverter.path)}
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
