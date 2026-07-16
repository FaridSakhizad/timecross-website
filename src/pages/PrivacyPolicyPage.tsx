import LegalPage from '../components/LegalPage';
import { SUPPORT_EMAIL } from '../config';

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updatedAt="July 16, 2026">
      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">Overview</h2>
        <p className="legalPage-para">TimeCross is designed to help you compare time across cities without requiring an
          account. The app and website aim to keep personal data collection minimal.</p>
      </section>

      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">Information You Provide</h2>
        <p className="legalPage-para">If you contact us by email or through the website contact form, your email address,
          subject, and message are sent through your email client to our support address.</p>
        <p className="legalPage-para">Do not include sensitive information in support messages unless it is necessary for
          your request.</p>
      </section>

      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">Local App Data</h2>
        <p className="legalPage-para">TimeCross may store preferences locally on your device or browser, such as selected
          cities, city order, and time format. This information is used to make the app feel familiar when you return.</p>
        <p className="legalPage-para">Local data is not an account backup. Clearing browser storage, deleting the app, or
          resetting device data may remove these preferences.</p>
      </section>

      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">Notifications</h2>
        <p className="legalPage-para">If you enable notifications, TimeCross uses your device notification system to show
          reminders you choose. You can disable notification permissions in your device settings.</p>
      </section>

      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">Third-Party Services</h2>
        <p className="legalPage-para">Opening store links, email links, or external support links may take you to services
          operated by third parties. Their privacy practices are governed by their own policies.</p>
      </section>

      <section className="legalPage-section">
        <h2 className="legalPage-sectionTitle">Contact</h2>
        <p className="legalPage-para">For privacy questions, contact us at <a className="legalPage-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
      </section>
    </LegalPage>
  );
}
