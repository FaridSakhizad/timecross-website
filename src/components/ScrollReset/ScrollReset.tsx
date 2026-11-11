import { useEffect, useEffectEvent } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router';

import { stripLanguageFromPathname } from '../../i18n/languageRouting';

/**
 * Starts a new page at the top, as a full page load would: client-side navigation keeps the
 * scroll position otherwise. Left alone are the back and forward buttons (the browser restores
 * the position), a change of language on the same page, and query updates by the widgets.
 * A link with #anchor scrolls to that element.
 */
export default function ScrollReset() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const pagePath = stripLanguageFromPathname(pathname);

  const resetScroll = useEffectEvent(() => {
    if (navigationType === NavigationType.Pop) {
      return;
    }

    const anchor = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;

    if (anchor) {
      anchor.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  });

  useEffect(() => {
    resetScroll();
  }, [pagePath]);

  return null;
}
