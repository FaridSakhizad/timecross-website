import './NotFoundPage.css';

import { Link } from 'react-router';

import Footer from '../components/Footer';
import Header from '../components/Header';
import Seo from '../components/Seo';
import { useI18n, type TranslationKey } from '../i18n';
import { getCanonicalLanguagePath } from '../i18n/languageRouting';
import { PAGES, type PageId } from '../routes';

type SuggestedPage = {
  pageId: PageId;
  labelKey: TranslationKey;
};

const SUGGESTED_PAGES: SuggestedPage[] = [
  { pageId: 'home', labelKey: 'common.home' },
  { pageId: 'worldClock', labelKey: 'common.worldClockLabel' },
  { pageId: 'meetingTimePlanner', labelKey: 'common.meetingPlannerLabel' },
  { pageId: 'timeZoneConverter', labelKey: 'common.timeZoneConverterLabel' },
];

/** Any URL that is not a page. The server answers it with status 404. */
export default function NotFoundPage() {
  const { language, t } = useI18n();

  return (
    <>
      <Seo />

      <Header />

      <main className="notFoundPage">
        <div className="container">
          <h1 className="notFoundPage-title">{t('notFound.title')}</h1>
          <p className="notFoundPage-text">{t('notFound.text')}</p>

          <ul className="notFoundPage-links">
            {SUGGESTED_PAGES.map(({ pageId, labelKey }) => (
              <li key={pageId}>
                <Link
                  className="button notFoundPage-link"
                  to={getCanonicalLanguagePath(language, PAGES[pageId].path)}
                >
                  {t(labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <Footer />
    </>
  );
}
