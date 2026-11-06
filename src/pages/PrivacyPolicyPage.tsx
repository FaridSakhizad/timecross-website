import LegalPage from '../components/LegalPage';
import Seo from '../components/Seo';
import { SITE_NAME, SUPPORT_EMAIL } from '../config';
import { useI18n } from '../i18n';

export default function PrivacyPolicyPage() {
  const { t } = useI18n();

  return (
    <>
      <Seo />

      <LegalPage
        title={t('legal.privacy.title')}
        updatedAt="2026-11-06"
      >
        <section className="legalPage-section">
          <h2 className="legalPage-sectionTitle">{t('legal.privacy.overviewTitle')}</h2>
          <p className="legalPage-para">{t('legal.privacy.overviewText', { siteName: SITE_NAME })}</p>
        </section>

        <section className="legalPage-section">
          <h2 className="legalPage-sectionTitle">{t('legal.privacy.infoTitle')}</h2>
          <p className="legalPage-para">{t('legal.privacy.infoText1', { siteName: SITE_NAME })}</p>
          <p className="legalPage-para">{t('legal.privacy.infoText2')}</p>
          <p className="legalPage-para">{t('legal.privacy.infoText3')}</p>
        </section>

        <section className="legalPage-section">
          <h2 className="legalPage-sectionTitle">{t('legal.privacy.localDataTitle')}</h2>
          <p className="legalPage-para">{t('legal.privacy.localDataText1', { siteName: SITE_NAME })}</p>
          <p className="legalPage-para">{t('legal.privacy.localDataText2')}</p>
        </section>

        <section className="legalPage-section">
          <h2 className="legalPage-sectionTitle">{t('legal.privacy.analyticsTitle')}</h2>
          <p className="legalPage-para">{t('legal.privacy.analyticsText1')}</p>
          <p className="legalPage-para">{t('legal.privacy.analyticsText2')}</p>
        </section>

        <section className="legalPage-section">
          <h2 className="legalPage-sectionTitle">{t('legal.privacy.notificationsTitle')}</h2>
          <p className="legalPage-para">{t('legal.privacy.notificationsText', { siteName: SITE_NAME })}</p>
        </section>

        <section className="legalPage-section">
          <h2 className="legalPage-sectionTitle">{t('legal.privacy.thirdPartyTitle')}</h2>
          <p className="legalPage-para">{t('legal.privacy.thirdPartyText')}</p>
        </section>

        <section className="legalPage-section">
          <h2 className="legalPage-sectionTitle">{t('legal.privacy.cityDataTitle')}</h2>
          <p className="legalPage-para">
            {t('legal.privacy.cityDataPrefix')}
            <a
              className="legalPage-link"
              href="https://www.geonames.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              GeoNames
            </a>
            {t('legal.privacy.cityDataLicensePrefix')}
            <a
              className="legalPage-link"
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
            >
              CC BY 4.0
            </a>
            {t('legal.privacy.cityDataSuffix')}
          </p>
        </section>

        <section className="legalPage-section">
          <h2 className="legalPage-sectionTitle">{t('legal.privacy.contactTitle')}</h2>
          <p className="legalPage-para">
            {t('legal.privacy.contactPrefix')}
            <a
              className="legalPage-link"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>
      </LegalPage>
    </>
  );
}
