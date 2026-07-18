import Cities from './components/Cities';
import Footer from './components/Footer';
import ScreenshotSlider from './components/ScreenshotSlider';
import Timelines from './components/Timelines';
import {
  APP_STORE_URL,
  BUY_ME_A_COFFEE_URL,
  CONTACT_API_PATH,
  GOOGLE_PLAY_URL,
  PRIVACY_POLICY_PATH,
  SITE_NAME,
  TERMS_OF_USE_PATH,
} from './config';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfUsePage from './pages/TermsOfUsePage';
import { getSettings, updateSettings, type TimeFormat } from './settings';
import { useState, type FormEvent } from 'react';

import './App.css';

type ContactFormStatus = 'idle' | 'sending' | 'sent' | 'error';

type ContactResponse = {
  ok: boolean;
  error?: string;
};

function App() {
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(() => getSettings().timeFormat);
  const [contactFormStatus, setContactFormStatus] = useState<ContactFormStatus>('idle');
  const [contactFormMessage, setContactFormMessage] = useState('');
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  const isPrivacyPolicyPage = currentPath === PRIVACY_POLICY_PATH;
  const isTermsOfUsePage = currentPath === TERMS_OF_USE_PATH;

  const handleTimeFormatButtonClick = () => {
    const nextSettings = updateSettings((settings) => ({
      ...settings,
      timeFormat: settings.timeFormat === '24h' ? '12h' : '24h',
    }));

    setTimeFormat(nextSettings.timeFormat);
  };

  const handleContactFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;
    const name = String(formData.get('name') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const message = String(formData.get('message') ?? '').trim();

    setContactFormStatus('sending');
    setContactFormMessage('');

    try {
      const response = await fetch(CONTACT_API_PATH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          message,
        }),
      });
      const result = await response.json() as ContactResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Unable to send message');
      }

      form.reset();
      setContactFormStatus('sent');
      setContactFormMessage('Message sent. Thank you!');
    } catch (error) {
      setContactFormStatus('error');
      setContactFormMessage(error instanceof Error ? error.message : 'Unable to send message');
    }
  };

  return (
    <>
      <header className="header">
        <div className="container container_header">
          <a href="/" className="logo" title={`${SITE_NAME} | Prod`}>
            <span className="logo-name">{SITE_NAME}</span>
            <span className="logo-pitch">Understand Time Across the World</span>
          </a>

          <div className="headerMenu">
            <a href={BUY_ME_A_COFFEE_URL} className="headerMenu-item">Buy Me a Coffee</a>

            <button type="button" className="headerMenu-item" onClick={handleTimeFormatButtonClick}>
              {timeFormat === '24h' ? 'AM/PM' : '24H'}
            </button>

            <button type="button" className="headerMenu-item nightMode" />

            <button type="button" className="headerMenu-item langSelectButton">English</button>
          </div>
        </div>
      </header>

      {isPrivacyPolicyPage && <PrivacyPolicyPage />}
      {isTermsOfUsePage && <TermsOfUsePage />}
      {!isPrivacyPolicyPage && !isTermsOfUsePage && (
        <>
      <section className="section hero">
        <div className="container container_hero">
          <div className="citiesBox">
            <Cities timeFormat={timeFormat} />
          </div>

          <div className="heroPreviewBox">
            <div className="iphonePreviewContainer">
              <div className="iphonePreviewBox"></div>
              <i className="iphonePreviewShadow" />
            </div>

            <div className="androidPreviewContainer">
              <div className="androidPreviewBox"></div>
            </div>
          </div>

          <div className="heroTextBox">
            <h1 className="heroText">Use this app to compare time across cities, organize them your way, and see the
              current time in each place at a glance.<br />Create reminders for specific cities to keep people, plans,
              and routines in sync across time zones.</h1>
          </div>

          <div className="heroDownload">
            <a href={APP_STORE_URL} className="heroDownload-button heroDownload-button_appStore">Download on the App Store</a>
            <a href={GOOGLE_PLAY_URL} className="heroDownload-button heroDownload-button_googlePlay">Get it on Google Play</a>
          </div>
        </div>
      </section>

      <section className="section timelines">
        <Timelines timeFormat={timeFormat} />
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">More Features</h2>

          <ul className="featuresList">
            <li className="featuresList-item">
              <div className="featuresList-header">
                <i className="featuresList-headerIcon"></i>
                <h3 className="featuresList-title">Notifications</h3>
              </div>
              <div className="featuresList-content">
                <p className="featuresList-para">Set city-based reminders for calls, meetings, handoffs, or daily
                  routines without doing timezone math in your head.</p>
                <p className="featuresList-para">{SITE_NAME} helps you choose the right local moment first, then reminds
                  you when that moment arrives.</p>
              </div>
            </li>

            <li className="featuresList-item">
              <div className="featuresList-header">
                <i className="featuresList-headerIcon"></i>
                <h3 className="featuresList-title">Synchronisation</h3>
              </div>
              <div className="featuresList-content">
                <p className="featuresList-para">Keep your favorite cities, order, and display preferences consistent
                  across the app, so your personal world clock always feels familiar.</p>
                <p className="featuresList-para">The goal is simple: open {SITE_NAME} anywhere and see the same people,
                  places, and working hours you rely on every day.</p>
              </div>
            </li>

            <li className="featuresList-item">
              <div className="featuresList-header">
                <i className="featuresList-headerIcon"></i>
                <h3 className="featuresList-title">Countdowns</h3>
              </div>
              <div className="featuresList-content">
                <p className="featuresList-para">See how much time is left until a specific hour in another city, even
                  when that city is already in tomorrow.</p>
                <p className="featuresList-para">Countdowns make planning feel concrete: no more guessing whether a
                  deadline, livestream, flight, or call is one hour away or half a day away.</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">Contact Us</h2>

          <form className="contactForm" onSubmit={handleContactFormSubmit}>
            <div className="contactForm-row">
              <input
                type="text"
                className="input contactForm-input"
                name="name"
                placeholder="Name*"
                maxLength={100}
                required
              />
            </div>
            <div className="contactForm-row">
              <input
                type="email"
                className="input contactForm-input"
                name="email"
                placeholder="Email*"
                maxLength={254}
                required
              />
            </div>
            <div className="contactForm-row">
              <textarea
                className="textarea contactForm-input"
                name="message"
                placeholder="Message*"
                maxLength={5000}
                required
              ></textarea>
            </div>
            <div className="contactForm-row">
              <button
                className="button contactForm-submitButton"
                type="submit"
                disabled={contactFormStatus === 'sending'}
              >
                {contactFormStatus === 'sending' ? 'Sending...' : 'Send'}
              </button>
            </div>
            {contactFormMessage && (
              <p
                className={`contactForm-status contactForm-status_${contactFormStatus}`}
                role="status"
              >
                {contactFormMessage}
              </p>
            )}
          </form>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <ScreenshotSlider />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">FAQ</h2>

          <div className="accordion accordion_faq">
            <details className="accordion-item">
              <summary className="accordion-header">
                <h3 className="accordion-title">Is {SITE_NAME} free?</h3>

                <span className="accordionTooltip">
                  <span className="accordionTooltip-title">
                    TL;DR
                  </span>
                  <span className="accordionTooltip-para">
                    Yes
                  </span>
                </span>
              </summary>

              <div className="accordion-content">
                <p className="accordion-para">Yes. {SITE_NAME} is free to download and use for the core experience:
                  tracking favorite cities, comparing time zones, and checking timelines across the day.</p>
                <p className="accordion-para">If paid features are added later, they will be clearly marked before you
                  enable them. The app is designed to be useful without forcing you into an account or subscription.</p>
              </div>
            </details>

            <details className="accordion-item">
              <summary className="accordion-header">
                <h3 className="accordion-title">Does it work offline?</h3>

                <span className="accordionTooltip">
                  <span className="accordionTooltip-title">
                    TL;DR
                  </span>
                  <span className="accordionTooltip-para">
                    Yes
                  </span>
                </span>
              </summary>

              <div className="accordion-content">
                <p className="accordion-para">Yes. {SITE_NAME} can calculate city times and time zone offsets on your device, so the main timeline
                  and city list continue to work without an internet connection.</p>
                <p className="accordion-para">Some things still depend on your device settings, such as the system clock and the time zone database
                  provided by the operating system.</p>
              </div>
            </details>

            <details className="accordion-item">
              <summary className="accordion-header">
                <h3 className="accordion-title">Do I need to register an account?</h3>

                <span className="accordionTooltip">
                  <span className="accordionTooltip-title">
                    TL;DR
                  </span>
                  <span className="accordionTooltip-para">
                    No
                  </span>
                </span>
              </summary>

              <div className="accordion-content">
                <p className="accordion-para">No. You can start using {SITE_NAME} right away without creating an account.
                  Your cities, ordering, display format, and other preferences are kept locally on your device.</p>
                <p className="accordion-para">That also means the app stays lightweight: there is no login step just to
                  check whether it is a good time to call, meet, or send a message.</p>
              </div>
            </details>

            <details className="accordion-item">
              <summary className="accordion-header">
                <h3 className="accordion-title">Which platforms are supported?</h3>

                <span className="accordionTooltip accordionTooltip_platforms">
                  <span className="accordionTooltip-title">
                    TL;DR
                  </span>
                  <span className="accordionTooltip-para">
                    IOS. Android — in progress
                  </span>
                </span>
              </summary>

              <div className="accordion-content">
                <p className="accordion-para">{SITE_NAME} is available for iOS. The Android version is in progress and is
                  being built to keep the same simple city list, timeline view, and notification flow.</p>
                <p className="accordion-para">The website also provides a lightweight preview of the core experience, so
                  you can explore how the timeline and city comparison work before installing the app.</p>
              </div>
            </details>

            <details className="accordion-item">
              <summary className="accordion-header">
                <h3 className="accordion-title">How do I enable Notifications?</h3>

                <span className="accordionTooltip accordionTooltip_howNotifications">
                  <span className="accordionTooltip-title">
                    TL;DR
                  </span>
                  <span className="accordionTooltip-para">
                    Menu &gt; Settings &gt; Notfications
                  </span>
                </span>
              </summary>

              <div className="accordion-content">
                <p className="accordion-para">Open the app menu, go to Settings, and choose Notifications. From there you
                  can enable reminders for the cities and times that matter to you.</p>
                <p className="accordion-para">Your device may also ask for notification permission. If notifications do
                  not appear, check that {SITE_NAME} is allowed to send alerts in your system settings.</p>
              </div>
            </details>
          </div>

        </div>
      </section>


      <section className="section">
        <div className="container">
          <h2 className="section-title">Real Use Cases</h2>
          <h3 className="section-subTitle">Why do You even need the app?</h3>

          <div className="realUseCases">
            <section className="realUseCases-section">
              <h4 className="h4 realUseCases-title">Remote Teams</h4>
              <p className="realUseCases-para">Coordinate meetings across continents.</p>
            </section>

            <section className="realUseCases-section">
              <h4 className="h4 realUseCases-title">Family Abroad</h4>
              <p className="realUseCases-para">Know when it's a good time to call.</p>
            </section>

            <section className="realUseCases-section">
              <h4 className="h4 realUseCases-title">Travelers</h4>
              <p className="realUseCases-para">Adapt to new time zones faster.</p>
            </section>

            <section className="realUseCases-section">
              <h4 className="h4 realUseCases-title">Freelancers</h4>
              <p className="realUseCases-para">Schedule work with international clients.</p>
            </section>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">Download</h2>

          <div className="download">
            <a href={APP_STORE_URL} className="downloadLink"></a>
            <a href={GOOGLE_PLAY_URL} className="downloadLink"></a>
          </div>
        </div>
      </section>
        </>
      )}

      <Footer />
    </>
  )
}

export default App
