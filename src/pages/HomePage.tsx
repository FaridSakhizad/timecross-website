import ContactForm from '../components/ContactForm';
import FAQ from '../components/FAQ';
import FeaturesList from '../components/FeaturesList';
import Footer from '../components/Footer';
import Header from '../components/Header';
import Hero from '../components/Hero';
import ScreenshotSlider from '../components/ScreenshotSlider';
import Timelines from '../components/Timelines';

import {
  ANDROID_APK_URL,
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
} from '../config';

import { useI18n } from '../i18n';
import type { ColorMode, TimeFormat } from '../settings';

type HomePageProps = {
  colorMode: ColorMode;
  timeFormat: TimeFormat;
  onColorModeButtonClick: () => void;
  onTimeFormatButtonClick: () => void;
};

export default function HomePage({
  colorMode,
  timeFormat,
  onColorModeButtonClick,
  onTimeFormatButtonClick,
}: HomePageProps) {
  const { t } = useI18n();

  return (
    <>
      <Header
        colorMode={colorMode}
        timeFormat={timeFormat}
        onColorModeButtonClick={onColorModeButtonClick}
        onTimeFormatButtonClick={onTimeFormatButtonClick}
      />

      <Hero timeFormat={timeFormat} />

      <section className="section section_timelines">
        <Timelines timeFormat={timeFormat} />
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">{t('home.moreFeaturesTitle')}</h2>

          <FeaturesList />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">{t('home.contactTitle')}</h2>

          <ContactForm />
        </div>
      </section>

      <section className="section section_screenshots">
        <div className="container">
          <ScreenshotSlider />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">{t('home.faqTitle')}</h2>

          <FAQ />
        </div>
      </section>

      <section className="section section_realUseCases">
        <div className="container">
          <h2 className="section-title">{t('home.realUseCasesTitle')}</h2>
          <h3 className="section-subTitle">{t('home.realUseCasesSubtitle')}</h3>

          <div className="realUseCases">
            <section className="realUseCases-section">
              <h4 className="h4 realUseCases-title">{t('home.useCases.remoteTeams.title')}</h4>
              <p className="realUseCases-para">{t('home.useCases.remoteTeams.text')}</p>
            </section>

            <section className="realUseCases-section">
              <h4 className="h4 realUseCases-title">{t('home.useCases.familyAbroad.title')}</h4>
              <p className="realUseCases-para">{t('home.useCases.familyAbroad.text')}</p>
            </section>

            <section className="realUseCases-section">
              <h4 className="h4 realUseCases-title">{t('home.useCases.travelers.title')}</h4>
              <p className="realUseCases-para">{t('home.useCases.travelers.text')}</p>
            </section>

            <section className="realUseCases-section">
              <h4 className="h4 realUseCases-title">{t('home.useCases.freelancers.title')}</h4>
              <p className="realUseCases-para">{t('home.useCases.freelancers.text')}</p>
            </section>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">{t('home.downloadTitle')}</h2>

          <div className="download">
            <a
              href={APP_STORE_URL}
              className="downloadLink downloadLink_appStore"
              aria-label={t('common.appStore')}
              target="_blank"
            ></a>
            <a
              href={GOOGLE_PLAY_URL}
              className="downloadLink downloadLink_googlePlay"
              aria-label={t('common.googlePlay')}
            ></a>
            <a
              href={ANDROID_APK_URL}
              className="downloadLink downloadLink_apk"
              aria-label={t('common.androidPreview')}
            ></a>

            <p className="download-note">{t('common.androidPreviewNote')}</p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
