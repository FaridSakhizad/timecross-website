import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './index.css';
import App from './App.tsx';
import { preloadPageWidgets } from './components/lazyWidgets';
import { I18nProvider } from './i18n';
import { loadDictionary } from './i18n/dictionaries';
import { getInitialLanguage } from './i18n/initialLanguage';

// A chunk can disappear after a deploy while an old page is still open: reload to get the new
// build instead of breaking. Once per 10 seconds at most, so a missing chunk cannot cause a reload loop.
window.addEventListener('vite:preloadError', (event) => {
  const reloadKey = 'timecross:chunkReloadAt';

  try {
    if (Date.now() - Number(sessionStorage.getItem(reloadKey)) < 10_000) {
      return;
    }

    sessionStorage.setItem(reloadKey, String(Date.now()));
  } catch {
    return;
  }

  event.preventDefault();
  window.location.reload();
});

async function start() {
  const rootElement = document.getElementById('root')!;
  const initialLanguage = getInitialLanguage();

  preloadPageWidgets(window.location.pathname);

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
