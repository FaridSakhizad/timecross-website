import { useEffect, useState } from 'react';

const NATIVE_SCROLL_TIMELINE_QUERY = '(max-width: 1023px), (hover: none) and (pointer: coarse)';

function getUsesNativeTimelineScroll() {
  return typeof window !== 'undefined'
    && window.matchMedia(NATIVE_SCROLL_TIMELINE_QUERY).matches;
}

export function useUsesNativeTimelineScroll() {
  const [usesNativeScroll, setUsesNativeScroll] = useState(getUsesNativeTimelineScroll);

  useEffect(() => {
    const mediaQuery = window.matchMedia(NATIVE_SCROLL_TIMELINE_QUERY);
    const updateUsesNativeScroll = () => setUsesNativeScroll(mediaQuery.matches);

    updateUsesNativeScroll();
    mediaQuery.addEventListener('change', updateUsesNativeScroll);

    return () => {
      mediaQuery.removeEventListener('change', updateUsesNativeScroll);
    };
  }, []);

  return usesNativeScroll;
}
