import LegalPage from '../components/LegalPage';
import { SITE_NAME, SUPPORT_EMAIL } from '../config';

export default function TermsOfUsePage() {
  return (
    <LegalPage title="Terms of Use" updatedAt="July 16, 2026">
      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">Acceptance</h2>
        <p className="legalPage-para">By using {SITE_NAME} or this website, you agree to these Terms of Use. If you do not
          agree, please do not use the app or website.</p>
      </section>

      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">Purpose of {SITE_NAME}</h2>
        <p className="legalPage-para">{SITE_NAME} helps compare times across cities, plan across time zones, and understand
          local time differences. It is a planning tool, not a guarantee that every schedule, calendar, or device clock is
          always correct.</p>
      </section>

      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">Your Responsibility</h2>
        <p className="legalPage-para">You are responsible for checking important times before relying on them for travel,
          work, medical, legal, financial, or other high-stakes decisions.</p>
        <p className="legalPage-para">Time zone rules can change, and device settings may affect displayed times.</p>
      </section>

      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">Acceptable Use</h2>
        <p className="legalPage-para">You agree not to misuse the app or website, attempt to disrupt its operation, or use
          it in a way that violates applicable laws.</p>
      </section>

      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">Availability and Changes</h2>
        <p className="legalPage-para">We may update, change, pause, or discontinue parts of {SITE_NAME} as the product
          evolves. Features described on the website may change over time.</p>
      </section>

      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">Contact</h2>
        <p className="legalPage-para">Questions about these terms can be sent to <a className="legalPage-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
      </section>
    </LegalPage>
  );
}
