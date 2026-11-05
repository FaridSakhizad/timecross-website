import './App.css';

import { useEffect, useLayoutEffect, type ComponentType, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router';

import { usePreferences } from './hooks/usePreferences';
import { useI18n } from './i18n';
import {
  getBrowserLanguage,
  getCanonicalLanguagePath,
  getLanguageFromUrlSegment,
  stripLanguageFromPathname,
} from './i18n/languageRouting';
import CitiesPage from './pages/CitiesPage';
import ConverterPage from './pages/ConverterPage';
import GridPage from './pages/GridPage';
import HomePage from './pages/HomePage';
import MeetingTimePlannerPage from './pages/MeetingTimePlannerPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfUsePage from './pages/TermsOfUsePage';
import TimeZoneConverterPage from './pages/TimeZoneConverterPage';
import WorldClockPage from './pages/WorldClockPage';
import { PAGES, PAGE_IDS, type PageId } from './routes';
import { getStoredLanguageSetting } from './settings';

type LocalizedRouteProps = {
  children: ReactNode;
};

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

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
    return (
      <Navigate
        replace
        to={getCanonicalLanguagePath(fallbackLanguage)}
      />
    );
  }

  if (!lang) {
    return (
      <Navigate
        replace
        to={getCanonicalLanguagePath(fallbackLanguage, pagePath)}
      />
    );
  }

  if (lang === 'uk') {
    return (
      <Navigate
        replace
        to={getCanonicalLanguagePath(routeLanguage ?? 'en', pagePath)}
      />
    );
  }

  return children;
}

// The pages themselves are listed in routes.ts; this maps each one to its component.
const PAGE_COMPONENTS: Record<PageId, ComponentType> = {
  home: HomePage,
  cities: CitiesPage,
  grid: GridPage,
  convert: ConverterPage,
  worldClock: WorldClockPage,
  meetingTimePlanner: MeetingTimePlannerPage,
  timeZoneConverter: TimeZoneConverterPage,
  privacy: PrivacyPolicyPage,
  terms: TermsOfUsePage,
};

function App() {
  const { colorMode } = usePreferences();

  useEffect(() => {
    document.documentElement.dataset.colorMode = colorMode;
  }, [colorMode]);

  return (
    <Routes>
      {PAGE_IDS.flatMap((pageId) => {
        const Page = PAGE_COMPONENTS[pageId];
        const path = PAGES[pageId].path.slice(1);
        const element = (
          <LocalizedRoute>
            <Page />
          </LocalizedRoute>
        );

        // Every page is available both without a language prefix (redirects) and with one.
        return [
          path
            ? (
                <Route
                  key={path}
                  path={path}
                  element={element}
                />
              )
            : (
                <Route
                  key="index"
                  index
                  element={element}
                />
              ),
          <Route
            key={`lang:${path}`}
            path={path ? `:lang/${path}` : ':lang'}
            element={element}
          />,
        ];
      })}
      <Route
        path="api/*"
        element={null}
      />
      <Route
        path="*"
        element={(
          <Navigate
            replace
            to="/"
          />
        )}
      />
    </Routes>
  );
}

export default App;
