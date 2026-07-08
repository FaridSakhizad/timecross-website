import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

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
            <h1 className="heroText">Use this app to compare time across cities, organize them your way, and see the current time in each place at a glance.<br />Create reminders for specific cities to keep people, plans, and routines in sync across time zones.</h1>
          </div>

          <div className="heroDownload">
            <a href="#" className="heroDownload-button heroDownload-button_appStore">Download on the App Store</a>
            <a href="#" className="heroDownload-button heroDownload-button_googlePlay">Get it on Google Play</a>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="content">
          <h1 className="h1">TimeCross</h1>
          <h2 className="h2">Understand Time Across the World</h2>

          <div className="links">
            {/*
              <a href="#" className="appStore"></a>
              <a href="#" className="gPlay disabled">
                <span className="gPlay-soon">Coming Soon</span>
              </a>
            */}
          </div>

          <div>{count}</div>
          <div><button type="button" onClick={() => setCount(count + 1)} /></div>

          <div className="support">Contact: <a href="mailto:support@timecross.app">support@timecross.app</a></div>
        </div>
      </div>

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
              <a href="/contact" className="footerMenu-link">Contact</a>
            </li>
          </ul>
        </div>
      </footer>
    </>
  )
}

export default App
