import { createContext, useContext } from 'react';

import { APP_LANGUAGES, type AppLanguage } from '../settings';

import type { TranslationKey, TranslationValues } from './dictionaries';

export type { TranslationKey, TranslationValues };

export const SUPPORTED_LANGUAGES = APP_LANGUAGES;

export type I18nContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
};

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n() {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error('useI18n must be used inside I18nProvider');
  }

  return value;
}
