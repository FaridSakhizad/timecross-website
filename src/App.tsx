import { Navigate, Route, Routes, useLocation, useParams } from 'react-router';
import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';

import Footer from './components/Footer';
import Header from './components/Header';
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
import { getSettings, updateSettings, type ColorMode, type TimeFormat } from './settings';

import './App.css';

type LocalizedRouteProps = {
  children: ReactNode;
};

function LocalizedRoute({ children }: LocalizedRouteProps) {
  const { lang } = useParams();
  const location = useLocation();
  const { language, setLanguage } = useI18n();
  const routeLanguage = getLanguageFromUrlSegment(lang);
  const fallbackLanguage = getBrowserLanguage();
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
    <>
      <Header
        colorMode={colorMode}
        timeFormat={timeFormat}
        onColorModeButtonClick={handleColorModeButtonClick}
        onTimeFormatButtonClick={handleTimeFormatButtonClick}
      />

      <Routes>
        <Route
          index
          element={(
            <LocalizedRoute>
              <HomePage timeFormat={timeFormat} />
            </LocalizedRoute>
          )}
        />
        <Route
          path="privacy-policy"
          element={(
            <LocalizedRoute>
              <PrivacyPolicyPage />
            </LocalizedRoute>
          )}
        />
        <Route
          path="terms-of-use"
          element={(
            <LocalizedRoute>
              <TermsOfUsePage />
            </LocalizedRoute>
          )}
        />
        <Route
          path=":lang"
          element={(
            <LocalizedRoute>
              <HomePage timeFormat={timeFormat} />
            </LocalizedRoute>
          )}
        />
        <Route
          path=":lang/privacy-policy"
          element={(
            <LocalizedRoute>
              <PrivacyPolicyPage />
            </LocalizedRoute>
          )}
        />
        <Route
          path=":lang/terms-of-use"
          element={(
            <LocalizedRoute>
              <TermsOfUsePage />
            </LocalizedRoute>
          )}
        />
        <Route path="api/*" element={null} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>

      <Footer />
    </>
  );
}

export default App;
