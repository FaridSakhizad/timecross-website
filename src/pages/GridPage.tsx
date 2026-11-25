import { Navigate, useLocation } from 'react-router';

import ClientOnly from '../components/ClientOnly';
import { TimelineGrid } from '../components/lazyWidgets';
import Seo from '../components/Seo';
import { getEventParams, readGridEventUrlState } from '../components/TimelineGrid/shared/eventUrlState';
import { useI18n } from '../i18n';
import { getCanonicalLanguagePath } from '../i18n/languageRouting';
import { PAGES } from '../routes';

export default function GridPage() {
  const { search, hash } = useLocation();
  const { language } = useI18n();
  const eventParams = getEventParams(search, hash);

  // Shared meetings open in the planner page, which describes them above the grid. Older links
  // pointed here, with the meeting in the hash.
  if (readGridEventUrlState(eventParams)) {
    return (
      <Navigate
        replace
        to={`${getCanonicalLanguagePath(language, PAGES.meetingTimePlanner.path)}?${eventParams.slice(1)}`}
      />
    );
  }

  return (
    <>
      <Seo />

      <ClientOnly>
        <TimelineGrid />
      </ClientOnly>
    </>
  );
}
