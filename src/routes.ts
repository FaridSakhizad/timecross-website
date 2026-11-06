/**
 * The site's pages: the single list that routing, redirects, SEO, the sitemap test and widget
 * preloading read. Plain data without components, so the Worker and Node tests can import it;
 * the components for each page are in App.tsx.
 */

export type PageWidget = 'cities' | 'timelineGrid' | 'timeZoneConverter';

type PageDefinition = {
  /** Path after the language prefix: '/' or '/world-clock'. */
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

/** The page at a path without the language prefix ('/grid'), or null for an unknown path. */
export function getPageIdByPath(pagePath: string): PageId | null {
  return PAGE_IDS.find((pageId) => PAGES[pageId].path === pagePath) ?? null;
}

/** Path of the page whose URL is canonical for this one: '/convert' -> '/time-zone-converter'. */
export function getCanonicalPagePath(pageId: PageId) {
  const page: Page = PAGES[pageId];

  return 'canonicalPage' in page ? PAGES[page.canonicalPage].path : page.path;
}
