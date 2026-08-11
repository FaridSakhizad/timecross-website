import LegalPage from '../components/LegalPage';
import { SITE_NAME, SUPPORT_EMAIL } from '../config';
import { useI18n } from '../i18n';
import type { ColorMode, TimeFormat } from '../settings';

type PrivacyPolicyPageProps = {
  colorMode: ColorMode;
  timeFormat: TimeFormat;
  onColorModeButtonClick: () => void;
  onTimeFormatButtonClick: () => void;
};

export default function PrivacyPolicyPage({
  colorMode,
  timeFormat,
  onColorModeButtonClick,
  onTimeFormatButtonClick,
}: PrivacyPolicyPageProps) {
  const { t } = useI18n();

  return (
    <LegalPage
      colorMode={colorMode}
      timeFormat={timeFormat}
      title={t('legal.privacy.title')}
      updatedAt="July 16, 2026"
      onColorModeButtonClick={onColorModeButtonClick}
      onTimeFormatButtonClick={onTimeFormatButtonClick}
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
        <h2 className="legalPage-sectionTitle">{t('legal.privacy.notificationsTitle')}</h2>
        <p className="legalPage-para">{t('legal.privacy.notificationsText', { siteName: SITE_NAME })}</p>
      </section>

      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">{t('legal.privacy.thirdPartyTitle')}</h2>
        <p className="legalPage-para">{t('legal.privacy.thirdPartyText')}</p>
      </section>

      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">{t('legal.privacy.contactTitle')}</h2>
        <p className="legalPage-para">
          {t('legal.privacy.contactPrefix')}
          <a className="legalPage-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
