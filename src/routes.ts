/**
 * The site's pages: the single list that routing, redirects, SEO, the sitemap and widget
 * preloading read. Plain data without components, so the Worker and Node tests can import it;
 * the components for each page are in App.tsx.
 */
import { getCityPair, getCityPairs, getReversedCityPair } from './timeDifference.ts';

export type PageWidget = 'cities' | 'timelineGrid' | 'timeZoneConverter';

type PageDefinition = {
  /**
   * Path after the language prefix: '/' or '/world-clock'. A page with a parameter has its route
   * pattern here ('/time-difference/:pair') and its real paths in getPagePaths.
   */
  path: string;
  /** Key of the page's texts in the translations: seo.pages.{seoKey}.title and so on. */
  seoKey: string;
  /**
   * False for the full-screen tool pages that repeat another page: they are not in the sitemap
   * and point search engines to that page with `canonicalPage` (without one they get "noindex").
   */
  isIndexed: boolean;
  /** Page whose URL is the canonical one, when it is another page. */
  canonicalPage?: string;
  /** Lazy widgets on the page, loaded together with the main bundle (see lazyWidgets.ts). */
  widgets: PageWidget[];
};

export const PAGES = {
  home: {
    path: '/',
    seoKey: 'home',
    isIndexed: true,
    widgets: ['cities', 'timelineGrid'],
  },
  cities: {
    path: '/cities',
    seoKey: 'cities',
    isIndexed: false,
    canonicalPage: 'worldClock',
    widgets: ['cities'],
  },
  grid: {
    path: '/grid',
    seoKey: 'grid',
    isIndexed: false,
    canonicalPage: 'meetingTimePlanner',
    widgets: ['timelineGrid'],
  },
  convert: {
    path: '/convert',
    seoKey: 'timeZoneConverter',
    isIndexed: false,
    canonicalPage: 'timeZoneConverter',
    widgets: ['timeZoneConverter'],
  },
  worldClock: {
    path: '/world-clock',
    seoKey: 'worldClock',
    isIndexed: true,
    widgets: ['cities'],
  },
  meetingTimePlanner: {
    path: '/meeting-time-planner',
    seoKey: 'meetingTimePlanner',
    isIndexed: true,
    widgets: ['timelineGrid'],
  },
  timeZoneConverter: {
    path: '/time-zone-converter',
    seoKey: 'timeZoneConverter',
    isIndexed: true,
    widgets: ['timeZoneConverter'],
  },
  hourClock: {
    path: '/24-hour-clock',
    seoKey: 'hourClock',
    isIndexed: true,
    widgets: [],
  },
  timeDifference: {
    path: '/time-difference/:pair',
    seoKey: 'timeDifference',
    isIndexed: true,
    widgets: [],
  },
  privacy: {
    path: '/privacy-policy',
    seoKey: 'privacy',
    isIndexed: true,
    widgets: [],
  },
  terms: {
    path: '/terms-of-use',
    seoKey: 'terms',
    isIndexed: true,
    widgets: [],
  },
} as const satisfies Record<string, PageDefinition>;

export type PageId = keyof typeof PAGES;

export type Page = (typeof PAGES)[PageId];

export const PAGE_IDS = Object.keys(PAGES) as PageId[];

const TIME_DIFFERENCE_PATH = '/time-difference/';

/** Path of a time difference page: '/time-difference/madrid-mexico-city'. */
export function getTimeDifferencePath(slug: string) {
  return `${TIME_DIFFERENCE_PATH}${slug}`;
}

/** The pair slug of a time difference path, or null for another path. */
export function getTimeDifferenceSlug(pagePath: string) {
  return pagePath.startsWith(TIME_DIFFERENCE_PATH) ? pagePath.slice(TIME_DIFFERENCE_PATH.length) : null;
}

/** Every path of a page: one, or one per city pair of the time difference pages. */
export function getPagePaths(pageId: PageId): string[] {
  if (pageId === 'timeDifference') {
    return getCityPairs().map((pair) => getTimeDifferencePath(pair.slug));
  }

  return [PAGES[pageId].path];
}

/** The page at a path without the language prefix ('/grid'), or null for an unknown path. */
export function getPageIdByPath(pagePath: string): PageId | null {
  const slug = getTimeDifferenceSlug(pagePath);

  if (slug !== null) {
    return getCityPair(slug) ? 'timeDifference' : null;
  }

  return PAGE_IDS.find((pageId) => PAGES[pageId].path === pagePath) ?? null;
}

/** Path of the page whose URL is canonical for the one at `pagePath`: '/convert' -> '/time-zone-converter'. */
export function getCanonicalPagePath(pagePath: string) {
  const pageId = getPageIdByPath(pagePath);
  const page: Page | null = pageId && PAGES[pageId];

  return page && 'canonicalPage' in page ? PAGES[page.canonicalPage].path : pagePath;
}

/** Where an old or reversed path of a page now is: '/time-difference/mexico-city-madrid' -> '…/madrid-mexico-city'. */
export function getMovedPagePath(pagePath: string) {
  const slug = getTimeDifferenceSlug(pagePath);
  const pair = slug === null ? null : getReversedCityPair(slug);

  return pair ? getTimeDifferencePath(pair.slug) : null;
}
