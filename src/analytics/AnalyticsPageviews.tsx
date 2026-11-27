import { useEffect } from 'react';
import { useLocation } from 'react-router';

import { trackPageview } from './analytics';

/**
 * A pageview for every page opened: on load and on each move to another page. Query updates by
 * the widgets (a picked date, a city list) are not new pages.
 */
export default function AnalyticsPageviews() {
  const { pathname } = useLocation();

  useEffect(() => {
    trackPageview();
  }, [pathname]);

  return null;
}
