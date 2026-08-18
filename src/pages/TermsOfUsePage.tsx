import LegalPage from '../components/LegalPage';
import Seo from '../components/Seo';
import { SITE_NAME, SUPPORT_EMAIL } from '../config';
import { useI18n } from '../i18n';
import type { ColorMode, TimeFormat } from '../settings';

type TermsOfUsePageProps = {
  colorMode: ColorMode;
  timeFormat: TimeFormat;
  onColorModeButtonClick: () => void;
  onTimeFormatButtonClick: () => void;
};

export default function TermsOfUsePage({
  colorMode,
  timeFormat,
  onColorModeButtonClick,
  onTimeFormatButtonClick,
}: TermsOfUsePageProps) {
  const { t } = useI18n();

  return (
    <>
      <Seo page="terms" />

      <LegalPage
        colorMode={colorMode}
        timeFormat={timeFormat}
        title={t('legal.terms.title')}
        updatedAt="July 16, 2026"
        onColorModeButtonClick={onColorModeButtonClick}
        onTimeFormatButtonClick={onTimeFormatButtonClick}
      >
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
    </>
  );
}
