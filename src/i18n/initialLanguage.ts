import { getStoredLanguageSetting, type AppLanguage } from '../settings';
import { getBrowserLanguage, getLanguageFromPathname } from './languageRouting';

/** Language of the first render in the browser: the URL, then the saved setting, then the browser. */
export function getInitialLanguage(): AppLanguage {
  if (typeof window === 'undefined') {
    return 'en';
  }

  return getLanguageFromPathname(window.location.pathname)
    ?? getStoredLanguageSetting()
    ?? getBrowserLanguage();
}
