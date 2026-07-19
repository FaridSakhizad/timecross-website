import { Navigate, Route, Routes, useLocation, useParams } from 'react-router';
import { useEffect, useState, type ReactNode } from 'react';

import Footer from './components/Footer';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfUsePage from './pages/TermsOfUsePage';
import { useI18n } from './i18n';
import {
  getCanonicalLanguagePath,
  getLanguageFromUrlSegment,
  stripLanguageFromPathname,
} from './i18n/languageRouting';
import { getSettings, updateSettings, type TimeFormat } from './settings';

import './App.css';

type LocalizedRouteProps = {
  children: ReactNode;
};

function LocalizedRoute({ children }: LocalizedRouteProps) {
  const { lang } = useParams();
  const location = useLocation();
  const { language, setLanguage } = useI18n();
  const routeLanguage = getLanguageFromUrlSegment(lang);
  const pagePath = stripLanguageFromPathname(location.pathname);

  useEffect(() => {
    if (routeLanguage && routeLanguage !== language) {
      setLanguage(routeLanguage);
    }
  }, [language, routeLanguage, setLanguage]);

  if (lang && !routeLanguage) {
    return <Navigate replace to="/" />;
  }

  if (lang === 'uk' || lang === 'en') {
    return <Navigate replace to={getCanonicalLanguagePath(routeLanguage ?? 'en', pagePath)} />;
  }

  if (routeLanguage && routeLanguage !== language) {
    return null;
  }

  return children;
}

function App() {
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(() => getSettings().timeFormat);
  const location = useLocation();

  const handleTimeFormatButtonClick = () => {
    const nextSettings = updateSettings((settings) => ({
      ...settings,
      timeFormat: settings.timeFormat === '24h' ? '12h' : '24h',
    }));

    setTimeFormat(nextSettings.timeFormat);
  };

  if (location.pathname.startsWith('/api/')) {
    return null;
  }

  return (
    <>
      <Header
        timeFormat={timeFormat}
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
