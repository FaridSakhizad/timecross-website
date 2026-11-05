import { lazy } from 'react';
import { stripLanguageFromPathname } from '../i18n/languageRouting';

/**
 * The interactive widgets render only in the browser (inside ClientOnly), so they are not needed for
 * the server HTML or for hydration. They live in their own chunks, which keeps the main bundle to
 * the page shell and text.
 */
const loadCities = () => import('./Cities');
const loadTimelines = () => import('./Timelines');
const loadTimelineGrid = () => import('./TimelineGrid');
const loadTimeZoneConverter = () => import('./TimeZoneConverter');

export const Cities = lazy(loadCities);
export const Timelines = lazy(loadTimelines);
export const TimelineGrid = lazy(loadTimelineGrid);
export const TimeZoneConverter = lazy(loadTimeZoneConverter);

// Widgets of each page, by the first path segment after the language.
const PAGE_WIDGETS: Record<string, (() => Promise<unknown>)[]> = {
  '': [loadCities, loadTimelines],
  cities: [loadCities],
  grid: [loadTimelineGrid],
  convert: [loadTimeZoneConverter],
  'world-clock': [loadCities],
  'meeting-time-planner': [loadTimelines],
  'time-zone-converter': [loadTimeZoneConverter],
};

/** Starts loading the current page's widgets together with the main bundle, so they do not wait for hydration. */
export function preloadPageWidgets(pathname: string) {
  const page = stripLanguageFromPathname(pathname).split('/').filter(Boolean)[0] ?? '';

  PAGE_WIDGETS[page]?.forEach((load) => {
    // A failed preload is retried by React.lazy when the widget renders.
    load().catch(() => {});
  });
}
