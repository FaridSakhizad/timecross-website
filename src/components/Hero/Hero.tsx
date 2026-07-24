import './style.css';

import Cities from '../Cities';

import heroImg1 from '../../assets/1-cities.jpg';
import heroImg2 from '../../assets/2-cities.jpg';

import {
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
} from '../../config';
import { useI18n } from '../../i18n';
import type { TimeFormat } from '../../settings';

type HeroProps = {
  timeFormat: TimeFormat;
};

export default function Hero({ timeFormat }: HeroProps) {
  const { t } = useI18n();

  return (
    <section className="section section_hero">
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
  );
}
