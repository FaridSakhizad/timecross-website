import type { AppLanguage } from '../settings';

/**
 * Locale passed to Intl for each interface language. Brazilian Portuguese matches the copy in pt.json.
 * Use it for anything people read (month and weekday names); machine formats keep a fixed locale.
 */
const INTL_LOCALES: Record<AppLanguage, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  uk: 'uk-UA',
  ru: 'ru-RU',
  es: 'es-ES',
  pt: 'pt-BR',
  de: 'de-DE',
};

export function getIntlLocale(language: AppLanguage) {
  return INTL_LOCALES[language];
}
