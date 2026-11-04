import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { updateSettings, type AppLanguage } from '../settings';
import { isDictionaryLoaded, loadDictionary, translate, type TranslationValues } from './dictionaries';
import { I18nContext, type I18nContextValue } from './i18nContext';
import { getInitialLanguage } from './initialLanguage';

type I18nProviderProps = {
  children: ReactNode;
  initialLanguage?: AppLanguage;
};

export function I18nProvider({ children, initialLanguage }: I18nProviderProps) {
  const [language, setLanguageState] = useState<AppLanguage>(() => initialLanguage ?? getInitialLanguage());

  const requestedLanguageRef = useRef(language);

  // The interface switches only once the new dictionary is loaded, so there is no flash of English.
  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    if (requestedLanguageRef.current === nextLanguage) {
      return;
    }

    requestedLanguageRef.current = nextLanguage;
    updateSettings((settings) => (settings.language === nextLanguage ? settings : { ...settings, language: nextLanguage }));

    const applyLanguage = () => {
      if (requestedLanguageRef.current === nextLanguage) {
        setLanguageState(nextLanguage);
      }
    };

    if (isDictionaryLoaded(nextLanguage)) {
      applyLanguage();
      return;
    }

    loadDictionary(nextLanguage)
      .then(applyLanguage)
      .catch((error) => {
        console.error(`Failed to load the "${nextLanguage}" translations:`, error);
        // English fallback keeps the interface readable.
        applyLanguage();
      });
  }, []);

  const t = useCallback(
    (key: string, values?: TranslationValues) => translate(language, key, values),
    [language],
  );

  const contextValue = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage,
    t,
  }), [language, setLanguage, t]);

  return (
    <I18nContext value={contextValue}>
      {children}
    </I18nContext>
  );
}
