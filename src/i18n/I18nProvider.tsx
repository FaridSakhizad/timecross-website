import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getStoredLanguageSetting, updateSettings, type AppLanguage } from '../settings';
import { I18nContext, type I18nContextValue, type TranslationValues } from './i18nContext';
import { getBrowserLanguage, getLanguageFromPathname } from './languageRouting';
import en from './locales/en.json';
import fr from './locales/fr.json';
import uk from './locales/uk.json';
import ru from './locales/ru.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import de from './locales/de.json';

type Dictionary = Record<string, unknown>;

const DICTIONARIES: Record<AppLanguage, Dictionary> = {
  en,
  fr,
  uk,
  ru,
  es,
  pt,
  de,
};

function getNestedValue(dictionary: Dictionary, key: string) {
  return key.split('.').reduce<unknown>((value, part) => {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return (value as Record<string, unknown>)[part];
  }, dictionary);
}

function interpolate(value: string, values: TranslationValues = {}) {
  return value.replace(/\{(\w+)\}/g, (match, key) => (
    values[key] === undefined ? match : String(values[key])
  ));
}

type I18nProviderProps = {
  children: ReactNode;
  initialLanguage?: AppLanguage;
};

function getInitialLanguage() {
  if (typeof window === 'undefined') {
    return 'en';
  }

  return getLanguageFromPathname(window.location.pathname)
    ?? getStoredLanguageSetting()
    ?? getBrowserLanguage();
}

export function I18nProvider({ children, initialLanguage }: I18nProviderProps) {
  const [language, setLanguageState] = useState<AppLanguage>(() => initialLanguage ?? getInitialLanguage());

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState((currentLanguage) => (
      currentLanguage === nextLanguage ? currentLanguage : nextLanguage
    ));
    updateSettings((settings) => ({
      ...settings,
      language: nextLanguage,
    }));
  }, []);

  const t = useCallback((key: string, values?: TranslationValues) => {
    const dictionary = DICTIONARIES[language];
    const value = getNestedValue(dictionary, key) ?? getNestedValue(DICTIONARIES.en, key);

    if (typeof value !== 'string') {
      return key;
    }

    return interpolate(value, values);
  }, [language]);

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
