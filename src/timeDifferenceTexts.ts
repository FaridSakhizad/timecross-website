/**
 * The sentences of a time difference page that depend on the numbers: shared by the page and its
 * SEO texts (the description and the FAQ schema), so both say the same thing.
 */
import { CITIES } from './cities';
import type { TranslationKey, TranslationValues } from './i18n/dictionaries';
import { getIntlLocale } from './i18n/intlLocale';
import type { AppLanguage } from './settings';
import {
  getDifferenceMinutes,
  getDifferencePeriods,
  getWorkingOverlap,
  type CityPair,
} from './timeDifference';
import { formatClockTime } from './utils/time';

type Translate = (key: TranslationKey, values?: TranslationValues) => string;

export type PairTextContext = {
  t: Translate;
  language: AppLanguage;
  pair: CityPair;
  now: Date;
  /** "16:00" or "4:00 PM", as the visitor prefers; 24-hour by default. */
  formatTime?: (date: Date, timezone: string) => string;
};

export function getPairCityNames(t: Translate, { cities: [first, second] }: CityPair) {
  return { cityA: t(`cityNames.${first}`), cityB: t(`cityNames.${second}`) };
}

/** "7 hours", "5,5 часа", "1 Stunde": the language's own plural forms. */
export function formatHours(language: AppLanguage, minutes: number) {
  return new Intl.NumberFormat(getIntlLocale(language), {
    style: 'unit',
    unit: 'hour',
    unitDisplay: 'long',
    maximumFractionDigits: 2,
  }).format(Math.abs(minutes) / 60);
}

/** "Madrid is 7 hours ahead of Mexico City." */
export function getDifferenceSentence({ t, language, pair, now }: PairTextContext) {
  const { cityA, cityB } = getPairCityNames(t, pair);
  const minutes = getDifferenceMinutes(pair.cities, now);

  if (minutes === 0) {
    return t('timeDifference.same', { cityA, cityB });
  }

  return t('timeDifference.ahead', {
    ahead: minutes > 0 ? cityB : cityA,
    behind: minutes > 0 ? cityA : cityB,
    difference: formatHours(language, minutes),
  });
}

/** Whether and how much the difference changes during the year. */
export function getChangesSentence({ t, language, pair, now }: PairTextContext) {
  const differences = getDifferencePeriods(pair.cities, now.getUTCFullYear()).map(({ minutes }) => Math.abs(minutes));
  const min = Math.min(...differences);
  const max = Math.max(...differences);

  return min === max
    ? t('timeDifference.changesNone', { difference: formatHours(language, min) })
    : t('timeDifference.changesRange', { min: formatHours(language, min), max: formatHours(language, max) });
}

/** When both cities are at work, in the times of both. */
export function getCallSentence(context: PairTextContext) {
  const { t, language, pair, now, formatTime = (date, timezone) => formatClockTime(date, timezone, '24h') } = context;
  const names = getPairCityNames(t, pair);
  const overlap = getWorkingOverlap(pair.cities, now);

  if (!overlap) {
    return t('timeDifference.callNone', names);
  }

  const first = CITIES[pair.cities[0]].timezone;
  const second = CITIES[pair.cities[1]].timezone;

  return t('timeDifference.callText', {
    ...names,
    duration: formatHours(language, overlap.minutes),
    startA: formatTime(overlap.start, first),
    endA: formatTime(overlap.end, first),
    startB: formatTime(overlap.start, second),
    endB: formatTime(overlap.end, second),
  });
}

/** The page's FAQ, also its FAQPage schema. */
export function getTimeDifferenceFaq(context: PairTextContext) {
  const { t, pair } = context;
  const names = getPairCityNames(t, pair);

  return [
    {
      id: 'difference',
      title: t('timeDifference.faq.differenceTitle', names),
      text: `${getDifferenceSentence(context)} ${getChangesSentence(context)}`,
    },
    {
      id: 'call',
      title: t('timeDifference.faq.callTitle', names),
      text: getCallSentence(context),
    },
    {
      id: 'dst',
      title: t('timeDifference.faq.dstTitle', names),
      text: t('timeDifference.faq.dstText'),
    },
  ];
}
