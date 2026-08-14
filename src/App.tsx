import { Navigate, Route, Routes, useLocation, useParams } from 'react-router';
import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';

import CitiesPage from './pages/CitiesPage';
import GridPage from './pages/GridPage';
import HomePage from './pages/HomePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfUsePage from './pages/TermsOfUsePage';
import { useI18n } from './i18n';
import {
  getBrowserLanguage,
  getCanonicalLanguagePath,
  getLanguageFromUrlSegment,
  stripLanguageFromPathname,
} from './i18n/languageRouting';
import {
  getSettings,
  getStoredLanguageSetting,
  updateSettings,
  type ColorMode,
  type TimeFormat,
} from './settings';

import './App.css';

type LocalizedRouteProps = {
  children: ReactNode;
};

function getRouteName(pathname: string) {
  const pagePath = stripLanguageFromPathname(pathname);
  const firstPathPart = pagePath.split('/').filter(Boolean)[0];

  switch (firstPathPart) {
    case undefined:
      return 'index';
    case 'cities':
    case 'grid':
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

  useLayoutEffect(() => {
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

function App() {
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(() => getSettings().timeFormat);
  const [colorMode, setColorMode] = useState<ColorMode>(() => getSettings().colorMode);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.colorMode = colorMode;
  }, [colorMode]);

  useEffect(() => {
    document.documentElement.dataset.route = getRouteName(location.pathname);
  }, [location.pathname]);

  const handleTimeFormatButtonClick = () => {
    const nextSettings = updateSettings((settings) => ({
      ...settings,
      timeFormat: settings.timeFormat === '24h' ? '12h' : '24h',
    }));

    setTimeFormat(nextSettings.timeFormat);
  };

  const handleColorModeButtonClick = () => {
    const nextSettings = updateSettings((settings) => ({
      ...settings,
      colorMode: settings.colorMode === 'night' ? 'day' : 'night',
    }));

    setColorMode(nextSettings.colorMode);
  };

  if (location.pathname.startsWith('/api/')) {
    return null;
  }

  return (
    <Routes>
      <Route
        index
        element={(
          <LocalizedRoute>
            <HomePage
              colorMode={colorMode}
              timeFormat={timeFormat}
              onColorModeButtonClick={handleColorModeButtonClick}
              onTimeFormatButtonClick={handleTimeFormatButtonClick}
            />
          </LocalizedRoute>
        )}
      />
      <Route
        path="privacy-policy"
        element={(
          <LocalizedRoute>
            <PrivacyPolicyPage
              colorMode={colorMode}
              timeFormat={timeFormat}
              onColorModeButtonClick={handleColorModeButtonClick}
              onTimeFormatButtonClick={handleTimeFormatButtonClick}
            />
          </LocalizedRoute>
        )}
      />
      <Route
        path="terms-of-use"
        element={(
          <LocalizedRoute>
            <TermsOfUsePage
              colorMode={colorMode}
              timeFormat={timeFormat}
              onColorModeButtonClick={handleColorModeButtonClick}
              onTimeFormatButtonClick={handleTimeFormatButtonClick}
            />
          </LocalizedRoute>
        )}
      />
      <Route
        path="cities"
        element={(
          <LocalizedRoute>
            <CitiesPage
              colorMode={colorMode}
              timeFormat={timeFormat}
              onColorModeButtonClick={handleColorModeButtonClick}
              onTimeFormatButtonClick={handleTimeFormatButtonClick}
            />
          </LocalizedRoute>
        )}
      />
      <Route
        path="grid"
        element={(
          <LocalizedRoute>
            <GridPage
              colorMode={colorMode}
              timeFormat={timeFormat}
              onColorModeButtonClick={handleColorModeButtonClick}
              onTimeFormatButtonClick={handleTimeFormatButtonClick}
            />
          </LocalizedRoute>
        )}
      />
      <Route
        path=":lang"
        element={(
          <LocalizedRoute>
            <HomePage
              colorMode={colorMode}
              timeFormat={timeFormat}
              onColorModeButtonClick={handleColorModeButtonClick}
              onTimeFormatButtonClick={handleTimeFormatButtonClick}
            />
          </LocalizedRoute>
        )}
      />
      <Route
        path=":lang/privacy-policy"
        element={(
          <LocalizedRoute>
            <PrivacyPolicyPage
              colorMode={colorMode}
              timeFormat={timeFormat}
              onColorModeButtonClick={handleColorModeButtonClick}
              onTimeFormatButtonClick={handleTimeFormatButtonClick}
            />
          </LocalizedRoute>
        )}
      />
      <Route
        path=":lang/terms-of-use"
        element={(
          <LocalizedRoute>
            <TermsOfUsePage
              colorMode={colorMode}
              timeFormat={timeFormat}
              onColorModeButtonClick={handleColorModeButtonClick}
              onTimeFormatButtonClick={handleTimeFormatButtonClick}
            />
          </LocalizedRoute>
        )}
      />
      <Route
        path=":lang/cities"
        element={(
          <LocalizedRoute>
            <CitiesPage
              colorMode={colorMode}
              timeFormat={timeFormat}
              onColorModeButtonClick={handleColorModeButtonClick}
              onTimeFormatButtonClick={handleTimeFormatButtonClick}
            />
          </LocalizedRoute>
        )}
      />
      <Route
        path=":lang/grid"
        element={(
          <LocalizedRoute>
            <GridPage
              colorMode={colorMode}
              timeFormat={timeFormat}
              onColorModeButtonClick={handleColorModeButtonClick}
              onTimeFormatButtonClick={handleTimeFormatButtonClick}
            />
          </LocalizedRoute>
        )}
      />
      <Route path="api/*" element={null} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}

export default App;
