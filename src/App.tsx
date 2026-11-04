import { Navigate, Route, Routes, useLocation, useParams } from 'react-router';
import { useEffect, useLayoutEffect, type ComponentType, type ReactNode } from 'react';

import './App.css';

import CitiesPage from './pages/CitiesPage';
import ConverterPage from './pages/ConverterPage';
import GridPage from './pages/GridPage';
import HomePage from './pages/HomePage';
import MeetingTimePlannerPage from './pages/MeetingTimePlannerPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfUsePage from './pages/TermsOfUsePage';
import TimeZoneConverterPage from './pages/TimeZoneConverterPage';
import WorldClockPage from './pages/WorldClockPage';
import { useI18n } from './i18n';
import {
  getBrowserLanguage,
  getCanonicalLanguagePath,
  getLanguageFromUrlSegment,
  stripLanguageFromPathname,
} from './i18n/languageRouting';
import {
  getStoredLanguageSetting,
  type ColorMode,
  type TimeFormat,
} from './settings';
import { usePreferences } from './usePreferences';

type LocalizedRouteProps = {
  children: ReactNode;
};

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function getRouteName(pathname: string) {
  const pagePath = stripLanguageFromPathname(pathname);
  const firstPathPart = pagePath.split('/').filter(Boolean)[0];

  switch (firstPathPart) {
    case undefined:
      return 'index';
    case 'cities':
    case 'convert':
    case 'grid':
    case 'meeting-time-planner':
    case 'time-zone-converter':
    case 'world-clock':
      return firstPathPart;
    case 'privacy-policy':
      return 'privacy';
    case 'terms-of-use':
      return 'terms';
    case 'api':
      return 'api';
    default:
      return 'index';
  }
}

function LocalizedRoute({ children }: LocalizedRouteProps) {
  const { lang } = useParams();
  const location = useLocation();
  const { language, setLanguage } = useI18n();
  const routeLanguage = getLanguageFromUrlSegment(lang);
  const fallbackLanguage = getStoredLanguageSetting() ?? getBrowserLanguage();
  const effectiveRouteLanguage = routeLanguage ?? fallbackLanguage;
  const pagePath = stripLanguageFromPathname(location.pathname);

  useIsomorphicLayoutEffect(() => {
    if (effectiveRouteLanguage !== language) {
      setLanguage(effectiveRouteLanguage);
    }
  }, [effectiveRouteLanguage, language, setLanguage]);

  if (lang && !routeLanguage) {
    return <Navigate replace to={getCanonicalLanguagePath(fallbackLanguage)} />;
  }

  if (!lang) {
    return <Navigate replace to={getCanonicalLanguagePath(fallbackLanguage, pagePath)} />;
  }

  if (lang === 'uk') {
    return <Navigate replace to={getCanonicalLanguagePath(routeLanguage ?? 'en', pagePath)} />;
  }

  return children;
}

type PageProps = {
  colorMode: ColorMode;
  timeFormat: TimeFormat;
  onColorModeButtonClick: () => void;
  onTimeFormatButtonClick: () => void;
};

const PAGE_ROUTES: { path: string; Page: ComponentType<PageProps> }[] = [
  { path: '', Page: HomePage },
  { path: 'privacy-policy', Page: PrivacyPolicyPage },
  { path: 'terms-of-use', Page: TermsOfUsePage },
  { path: 'cities', Page: CitiesPage },
  { path: 'grid', Page: GridPage },
  { path: 'convert', Page: ConverterPage },
  { path: 'world-clock', Page: WorldClockPage },
  { path: 'meeting-time-planner', Page: MeetingTimePlannerPage },
  { path: 'time-zone-converter', Page: TimeZoneConverterPage },
];

function App() {
  const { timeFormat, colorMode, toggleTimeFormat, toggleColorMode } = usePreferences();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.colorMode = colorMode;
  }, [colorMode]);

  useEffect(() => {
    document.documentElement.dataset.route = getRouteName(location.pathname);
  }, [location.pathname]);

  if (location.pathname.startsWith('/api/')) {
    return null;
  }

  const pageProps: PageProps = {
    colorMode,
    timeFormat,
    onColorModeButtonClick: toggleColorMode,
    onTimeFormatButtonClick: toggleTimeFormat,
  };

  return (
    <Routes>
      {PAGE_ROUTES.flatMap(({ path, Page }) => {
        const element = (
          <LocalizedRoute>
            <Page {...pageProps} />
          </LocalizedRoute>
        );

        // Every page is available both without a language prefix (redirects) and with one.
        return [
          path
            ? <Route key={path} path={path} element={element} />
            : <Route key="index" index element={element} />,
          <Route key={`lang:${path}`} path={path ? `:lang/${path}` : ':lang'} element={element} />,
        ];
      })}
      <Route path="api/*" element={null} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}

export default App;
