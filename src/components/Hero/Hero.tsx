import './style.css';

import Cities from '../Cities';

import heroImg1 from '../../assets/1-cities.jpg';
import heroImg2 from '../../assets/2-cities.jpg';
import heroImg3 from '../../assets/3-timelines.jpg';
import heroImg4 from '../../assets/4-add-city.jpg';
import heroImg5 from '../../assets/5-add-timezone.jpg';
import heroImg6 from '../../assets/6-notifications.jpg';

import {
  ANDROID_APK_URL,
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
} from '../../config';
import { useI18n } from '../../i18n';
import type { TimeFormat } from '../../settings';

type HeroProps = {
  timeFormat: TimeFormat;
};

const IPHONE_PREVIEW_IMAGES = [
  { image: heroImg1, altKey: 'seo.images.heroIphoneCities' },
  { image: heroImg3, altKey: 'seo.images.heroIphoneTimelines' },
  { image: heroImg5, altKey: 'seo.images.heroIphoneAddTimezone' },
];
const ANDROID_PREVIEW_IMAGES = [
  { image: heroImg2, altKey: 'seo.images.heroAndroidCities' },
  { image: heroImg4, altKey: 'seo.images.heroAndroidAddCity' },
  { image: heroImg6, altKey: 'seo.images.heroAndroidNotifications' },
];

export default function Hero({ timeFormat }: HeroProps) {
  const { t } = useI18n();

  return (
    <section className="section section_hero">
      <div className="container container_hero">
        <div className="citiesBox">
          <Cities showHomeButton={false} timeFormat={timeFormat} />
        </div>

        <div className="heroPreviewBox">
          <div className="iphonePreviewContainer">
            <div className="iphonePreviewBox">
              {IPHONE_PREVIEW_IMAGES.map(({ image, altKey }) => (
                <img src={image} className="iphonePreview-image" alt={t(altKey)} key={image} />
              ))}
            </div>
            <i className="iphonePreviewShadow" />
          </div>

          <div className="androidPreviewContainer">
            <div className="androidPreviewBox">
              {ANDROID_PREVIEW_IMAGES.map(({ image, altKey }) => (
                <img src={image} className="androidPreview-image" alt={t(altKey)} key={image} />
              ))}
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

          <a
            href={ANDROID_APK_URL}
            className="heroDownload-button heroDownload-buttonApk"
            aria-label={t('common.androidPreview')}
            target="_blank"
          ></a>

          <p className="heroDownload-note">{t('common.androidPreviewNote')}</p>
        </div>
      </div>
    </section>
  );
}
