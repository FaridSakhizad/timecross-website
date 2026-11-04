import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './index.css';
import App from './App.tsx';
import { I18nProvider } from './i18n';
import { loadDictionary } from './i18n/dictionaries';
import { getInitialLanguage } from './i18n/initialLanguage';

async function start() {
  const rootElement = document.getElementById('root')!;
  const initialLanguage = getInitialLanguage();

  try {
    // The server rendered the page in this language: load it first so hydration matches.
    await loadDictionary(initialLanguage);
  } catch (error) {
    console.error(`Failed to load the "${initialLanguage}" translations:`, error);
  }

  const app = (
    <StrictMode>
      <I18nProvider initialLanguage={initialLanguage}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </I18nProvider>
    </StrictMode>
  );

  if (rootElement.hasChildNodes()) {
    hydrateRoot(rootElement, app);
  } else {
    createRoot(rootElement).render(app);
  }
}

void start();
