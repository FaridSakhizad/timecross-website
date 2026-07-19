import './style.css';
import { Link } from 'react-router';
import {
  COPYRIGHT_HOLDER,
  COPYRIGHT_YEAR,
  PRIVACY_POLICY_PATH,
  TERMS_OF_USE_PATH,
  SUPPORT_EMAIL,
} from '../../config';
import { useI18n } from '../../i18n';
import { getCanonicalLanguagePath } from '../../i18n/languageRouting';

export default function Footer() {
  const { language, t } = useI18n();

  return (
    <footer className="footer">
      <div className="container container_footer">
        <span className="copyright">&copy; {COPYRIGHT_HOLDER} {COPYRIGHT_YEAR}</span>

        <ul className="footerMenu">
          <li className="footerMenu-item">
            <Link
              to={getCanonicalLanguagePath(language, TERMS_OF_USE_PATH)}
              className="footerMenu-link"
            >
              {t('common.termsOfUse')}
            </Link>
          </li>
          <li className="footerMenu-item">
            <Link
              to={getCanonicalLanguagePath(language, PRIVACY_POLICY_PATH)}
              className="footerMenu-link"
            >
              {t('common.privacyPolicy')}
            </Link>
          </li>
          <li className="footerMenu-item">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="footerMenu-link">{t('common.support')}</a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
