import { SITE_NAME } from '../../config';
import { useI18n } from '../../i18n';

import './style.css';

export default function FAQ() {
  const { t } = useI18n();

  return (
    <div className="accordion accordion_faq">
      <details className="accordion-item">
        <summary className="accordion-header">
          <h3 className="accordion-title">{t('faq.free.title', { siteName: SITE_NAME })}</h3>

          <span className="accordionTooltip">
            <span className="accordionTooltip-title">
              {t('faq.short')}
            </span>
            <span className="accordionTooltip-para">
              {t('faq.yes')}
            </span>
          </span>
        </summary>

        <div className="accordion-content">
          <p className="accordion-para">{t('faq.free.paragraph1', { siteName: SITE_NAME })}</p>
          <p className="accordion-para">{t('faq.free.paragraph2')}</p>
        </div>
      </details>

      <details className="accordion-item">
        <summary className="accordion-header">
          <h3 className="accordion-title">{t('faq.offline.title')}</h3>

          <span className="accordionTooltip">
            <span className="accordionTooltip-title">
              {t('faq.short')}
            </span>
            <span className="accordionTooltip-para">
              {t('faq.yes')}
            </span>
          </span>
        </summary>

        <div className="accordion-content">
          <p className="accordion-para">{t('faq.offline.paragraph1', { siteName: SITE_NAME })}</p>
          <p className="accordion-para">{t('faq.offline.paragraph2')}</p>
        </div>
      </details>

      <details className="accordion-item">
        <summary className="accordion-header">
          <h3 className="accordion-title">{t('faq.account.title')}</h3>

          <span className="accordionTooltip">
            <span className="accordionTooltip-title">
              {t('faq.short')}
            </span>
            <span className="accordionTooltip-para">
              {t('faq.no')}
            </span>
          </span>
        </summary>

        <div className="accordion-content">
          <p className="accordion-para">{t('faq.account.paragraph1', { siteName: SITE_NAME })}</p>
          <p className="accordion-para">{t('faq.account.paragraph2')}</p>
        </div>
      </details>

      <details className="accordion-item">
        <summary className="accordion-header">
          <h3 className="accordion-title">{t('faq.platforms.title')}</h3>

          <span className="accordionTooltip accordionTooltip_platforms">
            <span className="accordionTooltip-title">
              {t('faq.short')}
            </span>
            <span className="accordionTooltip-para">
              {t('faq.platformsShort')}
            </span>
          </span>
        </summary>

        <div className="accordion-content">
          <p className="accordion-para">{t('faq.platforms.paragraph1', { siteName: SITE_NAME })}</p>
          <p className="accordion-para">{t('faq.platforms.paragraph2')}</p>
        </div>
      </details>

      <details className="accordion-item">
        <summary className="accordion-header">
          <h3 className="accordion-title">{t('faq.notifications.title')}</h3>

          <span className="accordionTooltip accordionTooltip_howNotifications">
            <span className="accordionTooltip-title">
              {t('faq.short')}
            </span>
            <span className="accordionTooltip-para">
              {t('faq.notificationsShort')}
            </span>
          </span>
        </summary>

        <div className="accordion-content">
          <p className="accordion-para">{t('faq.notifications.paragraph1')}</p>
          <p className="accordion-para">{t('faq.notifications.paragraph2', { siteName: SITE_NAME })}</p>
        </div>
      </details>
    </div>
  );
}
