import './style.css';
import {
  COPYRIGHT_HOLDER,
  COPYRIGHT_YEAR,
  PRIVACY_POLICY_PATH,
  TERMS_OF_USE_PATH,
  SUPPORT_EMAIL,
} from '../../config';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container container_footer">
        <span className="copyright">&copy; {COPYRIGHT_HOLDER} {COPYRIGHT_YEAR}</span>

        <ul className="footerMenu">
          <li className="footerMenu-item">
            <a href={TERMS_OF_USE_PATH} className="footerMenu-link">Terms Of Use</a>
          </li>
          <li className="footerMenu-item">
            <a href={PRIVACY_POLICY_PATH} className="footerMenu-link">Privacy Policy</a>
          </li>
          <li className="footerMenu-item">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="footerMenu-link">Support</a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
