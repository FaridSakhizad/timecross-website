import { lazy } from 'react';

import { stripLanguageFromPathname } from '../i18n/languageRouting';
import { PAGES, getPageIdByPath, type PageWidget } from '../routes';
import { preload } from '../utils/preload';

/**
 * The interactive widgets render only in the browser (inside ClientOnly), so they are not needed for
 * the server HTML or for hydration. They live in their own chunks, which keeps the main bundle to
 * the page shell and text.
 */
const loadCities = () => import('./Cities');
const loadTimelineGrid = () => import('./TimelineGrid');
const loadTimeZoneConverter = () => import('./TimeZoneConverter');

export const Cities = lazy(loadCities);
export const TimelineGrid = lazy(loadTimelineGrid);
export const TimeZoneConverter = lazy(loadTimeZoneConverter);

const WIDGET_LOADERS: Record<PageWidget, () => Promise<unknown>> = {
  cities: loadCities,
  timelineGrid: loadTimelineGrid,
  timeZoneConverter: loadTimeZoneConverter,
};

/** Starts loading the current page's widgets together with the main bundle, so they do not wait for hydration. */
export function preloadPageWidgets(pathname: string) {
  const pageId = getPageIdByPath(stripLanguageFromPathname(pathname));

  if (!pageId) {
    return;
  }

  // A failed preload is retried by React.lazy when the widget renders.
  PAGES[pageId].widgets.forEach((widget) => preload(WIDGET_LOADERS[widget]));
}
