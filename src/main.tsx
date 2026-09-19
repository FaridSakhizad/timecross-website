import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './i18n'
import { getDefaultSettings } from './settings'

const rootElement = document.getElementById('root')!
const app = (
  <StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <App initialSettings={getDefaultSettings()} />
      </BrowserRouter>
    </I18nProvider>
  </StrictMode>
)

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app)
} else {
  createRoot(rootElement).render(app)
}
