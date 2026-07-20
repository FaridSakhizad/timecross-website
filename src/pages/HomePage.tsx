import Cities from '../components/Cities';
import ContactForm from '../components/ContactForm';
import FAQ from '../components/FAQ';
import ScreenshotSlider from '../components/ScreenshotSlider';
import Timelines from '../components/Timelines';

import heroImg1 from '../assets/1-cities.jpg';
import heroImg2 from '../assets/2-cities.jpg';

import {
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
  SITE_NAME,
} from '../config';

import { useI18n } from '../i18n';
import type { TimeFormat } from '../settings';

type HomePageProps = {
  timeFormat: TimeFormat;
};

export default function HomePage({ timeFormat }: HomePageProps) {
  const { t } = useI18n();

  return (
    <>
      <section className="section hero">
        <div className="container container_hero">
          <div className="citiesBox">
            <Cities timeFormat={timeFormat} />
          </div>

          <div className="heroPreviewBox">
            <div className="iphonePreviewContainer">
              <div className="iphonePreviewBox">
                <img src={heroImg1} className="iphonePreview-image" alt="" />
              </div>
              <i className="iphonePreviewShadow" />
            </div>

            <div className="androidPreviewContainer">
              <div className="androidPreviewBox">
                <img src={heroImg2} className="androidPreview-image" alt="" />
              </div>
            </div>
          </div>

          <div className="heroTextBox">
            <h1 className="heroText">
              {t('home.heroText').split('\n').map((line, index) => (
                <span key={line}>
                  {index > 0 && <br />}
                  {line}
                </span>
              ))}
            </h1>
          </div>

          <div className="heroDownload">
            <a
              href={APP_STORE_URL}
              className="heroDownload-button heroDownload-button_appStore"
              aria-label={t('common.appStore')}
              target="_blank"
            ></a>
            <a
              href={GOOGLE_PLAY_URL}
              className="heroDownload-button heroDownload-button_googlePlay"
              aria-label={t('common.googlePlay')}
              data-coming-soon={t('common.comingSoon')}
              target="_blank"
            ></a>
          </div>
        </div>
      </section>

      <section className="section timelines">
        <Timelines timeFormat={timeFormat} />
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">{t('home.moreFeaturesTitle')}</h2>

          <ul className="featuresList">
            <li className="featuresList-item">
              <div className="featuresList-header">
                <i className="featuresList-headerIcon featuresList-headerIcon_notifications"></i>
                <h3 className="featuresList-title">{t('home.features.notifications.title')}</h3>
              </div>
              <div className="featuresList-content">
                <p className="featuresList-para">{t('home.features.notifications.paragraph1')}</p>
                <p className="featuresList-para">{t('home.features.notifications.paragraph2', { siteName: SITE_NAME })}</p>
              </div>
            </li>

            <li className="featuresList-item">
              <div className="featuresList-header">
                <i className="featuresList-headerIcon featuresList-headerIcon_calendar"></i>
                <h3 className="featuresList-title">{t('home.features.synchronisation.title')}</h3>
              </div>
              <div className="featuresList-content">
                <p className="featuresList-para">{t('home.features.synchronisation.paragraph1')}</p>
                <p className="featuresList-para">{t('home.features.synchronisation.paragraph2', { siteName: SITE_NAME })}</p>
              </div>
            </li>

            <li className="featuresList-item">
              <div className="featuresList-header">
                <i className="featuresList-headerIcon featuresList-headerIcon_countdowns"></i>
                <h3 className="featuresList-title">{t('home.features.countdowns.title')}</h3>
              </div>
              <div className="featuresList-content">
                <span className="featuresList-comingSoon">{t('common.comingSoon')}</span>
                <p className="featuresList-para">{t('home.features.countdowns.paragraph1')}</p>
                <p className="featuresList-para">{t('home.features.countdowns.paragraph2')}</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">{t('home.contactTitle')}</h2>

          <ContactForm />
        </div>
      </section>

      <section className="section">
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
              data-coming-soon={t('common.comingSoon')}
            ></a>
          </div>
        </div>
      </section>
    </>
  );
}
