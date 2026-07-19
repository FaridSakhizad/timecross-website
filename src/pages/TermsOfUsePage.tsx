import LegalPage from '../components/LegalPage';
import { SITE_NAME, SUPPORT_EMAIL } from '../config';
import { useI18n } from '../i18n';

export default function TermsOfUsePage() {
  const { t } = useI18n();

  return (
    <LegalPage title={t('legal.terms.title')} updatedAt="July 16, 2026">
      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">{t('legal.terms.acceptanceTitle')}</h2>
        <p className="legalPage-para">{t('legal.terms.acceptanceText', { siteName: SITE_NAME })}</p>
      </section>

      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">{t('legal.terms.purposeTitle', { siteName: SITE_NAME })}</h2>
        <p className="legalPage-para">{t('legal.terms.purposeText', { siteName: SITE_NAME })}</p>
      </section>

      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">{t('legal.terms.responsibilityTitle')}</h2>
        <p className="legalPage-para">{t('legal.terms.responsibilityText1')}</p>
        <p className="legalPage-para">{t('legal.terms.responsibilityText2')}</p>
      </section>

      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">{t('legal.terms.acceptableUseTitle')}</h2>
        <p className="legalPage-para">{t('legal.terms.acceptableUseText')}</p>
      </section>

      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">{t('legal.terms.availabilityTitle')}</h2>
        <p className="legalPage-para">{t('legal.terms.availabilityText', { siteName: SITE_NAME })}</p>
      </section>

      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">{t('legal.terms.contactTitle')}</h2>
        <p className="legalPage-para">
          {t('legal.terms.contactPrefix')}
          <a className="legalPage-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
