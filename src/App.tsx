import './App.css'

function App() {
  return (
    <>
      <header className="header">
        <div className="container container_header">
          <a href="/" className="logo">
            <span className="logo-name">TimeCross</span>
            <span className="logo-pitch">Understand Time Across the World</span>
          </a>

          <div className="headerMenu">
            <a href="#" className="headerMenu-item">Buy Me a Coffee</a>

            <button type="button" className="headerMenu-item">AM/PM</button>

            <button type="button" className="headerMenu-item nightMode" />

            <button type="button" className="headerMenu-item langSelectButton">English</button>
          </div>
        </div>
      </header>

      <section className="section hero">
        <div className="container container_hero">
          <div className="citiesBox"></div>

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
            <a href="#" className="heroDownload-button heroDownload-button_appStore">Download on the App Store</a>
            <a href="#" className="heroDownload-button heroDownload-button_googlePlay">Get it on Google Play</a>
          </div>
        </div>
      </section>

      <section className="section timelines">
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
                <p className="featuresList-para">Use this app to compare time across cities, organize them your way, and
                  see the current time in each place at a glance.</p>
                <p className="featuresList-para">Create reminders for specific cities to keep people, plans, and
                  routines in sync across time zones.</p>
              </div>
            </li>

            <li className="featuresList-item">
              <div className="featuresList-header">
                <i className="featuresList-headerIcon"></i>
                <h3 className="featuresList-title">Synchronisation</h3>
              </div>
              <div className="featuresList-content">
                <p className="featuresList-para">Use this app to compare time across cities, organize them your way, and
                  see the current time in each
                  place at a glance.</p>
                <p className="featuresList-para">Create reminders for specific cities to keep people, plans, and
                  routines in sync across time
                  zones.</p>
                <p className="featuresList-para">Create reminders for specific cities to keep people, plans, and
                  routines in sync across time
                  zones.</p>
              </div>
            </li>

            <li className="featuresList-item">
              <div className="featuresList-header">
                <i className="featuresList-headerIcon"></i>
                <h3 className="featuresList-title">Countdowns</h3>
              </div>
              <div className="featuresList-content">
                <p className="featuresList-para">Use this app to compare time across cities, organize them your way, and
                  see the current time in each
                  place at a glance.</p>
                <p className="featuresList-para">Create reminders for specific cities to keep people, plans, and
                  routines in sync across time
                  zones.</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">Contact Us</h2>

          <form className="contactForm">
            <div className="contactForm-row">
              <input type="email" className="input contactForm-input" placeholder="Email*" />
            </div>
            <div className="contactForm-row">
              <input type="text" className="input contactForm-input" placeholder="Subject" />
            </div>
            <div className="contactForm-row">
              <textarea className="textarea contactForm-input" placeholder="Message*"></textarea>
            </div>
            <div className="contactForm-row">
              <button className="button contactForm-submitButton" type="submit">Send</button>
            </div>
          </form>

          <div className="support">Contact: <a href="mailto:support@timecross.app">support@timecross.app</a></div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">FAQ</h2>

          <div className="accordion accordion_faq">
            <details className="accordion-item">
              <summary className="accordion-header">
                <h3 className="accordion-title">Is TimeCross free?</h3>
              </summary>

              <div className="accordion-content">
                <p>Epcot is a theme park at Walt Disney World Resort featuring exciting attractions, international
                  pavilions, award-winning fireworks and seasonal special events.</p>
                <p>Epcot is a theme park at Walt Disney World Resort featuring exciting attractions, international
                  pavilions, award-winning fireworks and seasonal special events.</p>
                <p>Epcot is a theme park at Walt Disney World Resort featuring exciting attractions, international
                  pavilions, award-winning fireworks and seasonal special events.</p>
              </div>
            </details>

            <details className="accordion-item">
              <summary className="accordion-header">
                <h3 className="accordion-title">Does it work offline?</h3>
              </summary>

              <div className="accordion-content">
                <p>Epcot is a theme park at Walt Disney World Resort featuring exciting attractions, international
                  pavilions, award-winning fireworks and seasonal special events.</p>
              </div>
            </details>

            <details className="accordion-item">
              <summary className="accordion-header">
                <h3 className="accordion-title">Do I need to register an account?</h3>
              </summary>

              <div className="accordion-content">
                <p>Epcot is a theme park at Walt Disney World Resort featuring exciting attractions, international
                  pavilions, award-winning fireworks and seasonal special events.</p>
              </div>
            </details>

            <details className="accordion-item">
              <summary className="accordion-header">
                <h3 className="accordion-title">Which platforms are supported?</h3>
              </summary>

              <div className="accordion-content">
                <p>Epcot is a theme park at Walt Disney World Resort featuring exciting attractions, international
                  pavilions, award-winning fireworks and seasonal special events.</p>
              </div>
            </details>

            <details className="accordion-item">
              <summary className="accordion-header">
                <h3 className="accordion-title">How do I enable Notifications?</h3>
              </summary>

              <div className="accordion-content">
                <p>Epcot is a theme park at Walt Disney World Resort featuring exciting attractions, international
                  pavilions, award-winning fireworks and seasonal special events.</p>
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
            <a href="" className="downloadLink"></a>
            <a href="" className="downloadLink"></a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container container_footer">
          <span className="copyright">&copy; Farid Sakhizad 2026</span>

          <ul className="footerMenu">
            <li className="footerMenu-item">
              <a href="mailto:support@timecross.app" className="footerMenu-link">Support</a>
            </li>
            <li className="footerMenu-item">
              <a href="/privacy-policy" className="footerMenu-link">Privacy Policy</a>
            </li>
            <li className="footerMenu-item">
              <a href="mailto:support@timecross.app" className="footerMenu-link">Contact</a>
            </li>
          </ul>
        </div>
      </footer>
    </>
  )
}

export default App
