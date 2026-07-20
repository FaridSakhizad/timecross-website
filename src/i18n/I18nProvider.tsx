import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { updateSettings, type AppLanguage } from '../settings';
import { getBrowserLanguage, getLanguageFromPathname } from './languageRouting';
import en from './locales/en.json';
import fr from './locales/fr.json';
import uk from './locales/uk.json';
import ru from './locales/ru.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import de from './locales/de.json';

const DICTIONARIES = {
  en,
  fr,
  uk,
  ru,
  es,
  pt,
  de,
};

export const SUPPORTED_LANGUAGES: AppLanguage[] = ['en', 'fr', 'uk', 'ru', 'es', 'pt', 'de'];

type Dictionary = typeof en;
type TranslationValues = Record<string, string | number>;

type I18nContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string, values?: TranslationValues) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

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
};

function getInitialLanguage() {
  return getLanguageFromPathname(window.location.pathname) ?? getBrowserLanguage();
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<AppLanguage>(getInitialLanguage);

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

export function useI18n() {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error('useI18n must be used inside I18nProvider');
  }

  return value;
}
