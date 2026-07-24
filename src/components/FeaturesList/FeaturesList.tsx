import './style.css';

import { SITE_NAME } from '../../config';
import { useI18n } from '../../i18n';

export default function FeaturesList() {
  const { t } = useI18n();

  return (
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
  );
}
