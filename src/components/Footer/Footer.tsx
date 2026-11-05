import './style.css';
import {
  COPYRIGHT_HOLDER,
  COPYRIGHT_YEAR,
  SUPPORT_EMAIL,
} from '../../config';
import { useI18n } from '../../i18n';
import { getCanonicalLanguagePath } from '../../i18n/languageRouting';
import { PAGES } from '../../routes';

export default function Footer() {
  const { language, t } = useI18n();

  return (
    <footer className="footer">
      <div className="container container_footer">
        <span className="copyright">{`© ${COPYRIGHT_HOLDER} ${COPYRIGHT_YEAR}`}</span>

        <ul className="footerMenu">
          <li className="footerMenu-item">
            <a
              href={getCanonicalLanguagePath(language, PAGES.worldClock.path)}
              className="footerMenu-link"
            >
              {t('common.worldClockLabel')}
            </a>
          </li>
          <li className="footerMenu-item">
            <a
              href={getCanonicalLanguagePath(language, PAGES.meetingTimePlanner.path)}
              className="footerMenu-link"
            >
              {t('common.meetingPlannerLabel')}
            </a>
          </li>
          <li className="footerMenu-item">
            <a
              href={getCanonicalLanguagePath(language, PAGES.timeZoneConverter.path)}
              className="footerMenu-link"
            >
              {t('common.timeZoneConverterLabel')}
            </a>
          </li>
          <li className="footerMenu-item">
            <a
              href={getCanonicalLanguagePath(language, PAGES.terms.path)}
              className="footerMenu-link"
            >
              {t('common.termsOfUse')}
            </a>
          </li>
          <li className="footerMenu-item">
            <a
              href={getCanonicalLanguagePath(language, PAGES.privacy.path)}
              className="footerMenu-link"
            >
              {t('common.privacyPolicy')}
            </a>
          </li>
          <li className="footerMenu-item">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="footerMenu-link"
            >
              {t('common.support')}
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
