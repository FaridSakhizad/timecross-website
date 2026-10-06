import './WorldClockPage.css';

import { Link } from 'react-router';

import Cities from '../components/Cities';
import AppDownloadCta from '../components/AppDownloadCta';
import ClientOnly from '../components/ClientOnly';
import Footer from '../components/Footer';
import Header from '../components/Header';
import Seo from '../components/Seo';
import { useI18n } from '../i18n';
import { getCanonicalLanguagePath } from '../i18n/languageRouting';
import type { ColorMode, TimeFormat } from '../settings';

type WorldClockPageProps = {
  colorMode: ColorMode;
  timeFormat: TimeFormat;
  onColorModeButtonClick: () => void;
  onTimeFormatButtonClick: () => void;
};

export default function WorldClockPage({
  colorMode,
  timeFormat,
  onColorModeButtonClick,
  onTimeFormatButtonClick,
}: WorldClockPageProps) {
  const { language, t } = useI18n();

  return (
    <>
      <Seo page="worldClock" />

      <Header
        colorMode={colorMode}
        timeFormat={timeFormat}
        onColorModeButtonClick={onColorModeButtonClick}
        onTimeFormatButtonClick={onTimeFormatButtonClick}
      />

      <main className="worldClockPage">
        <section className="section worldClockHero">
          <div className="container worldClockHero-container">
            <div className="worldClockHero-text">
              <h1 className="worldClockHero-title">{t('worldClock.title')}</h1>
              <p className="worldClockHero-lead">{t('worldClock.lead')}</p>
              <p className="worldClockHero-description">{t('worldClock.description')}</p>
              <AppDownloadCta className="worldClockHero-cta" />
            </div>

            <div className="worldClockWidget">
              <ClientOnly>
                <Cities
                  colorMode={colorMode}
                  customClassNames="worldClockCities"
                  timeFormat={timeFormat}
                  onColorModeButtonClick={onColorModeButtonClick}
                  onTimeFormatButtonClick={onTimeFormatButtonClick}
                />
              </ClientOnly>
            </div>
          </div>
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
              <Link
                className="worldClockLinks-link"
                to={getCanonicalLanguagePath(language, '/grid')}
              >
                {t('worldClock.gridLink')}
              </Link>
              <Link
                className="worldClockLinks-link"
                to={getCanonicalLanguagePath(language, '/cities')}
              >
                {t('worldClock.citiesLink')}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
