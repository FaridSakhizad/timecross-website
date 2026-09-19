import { useEffect, useState } from 'react';

const NATIVE_SCROLL_TIMELINE_QUERY = '(hover: none) and (pointer: coarse)';

export function useUsesNativeTimelineScroll() {
  const [usesNativeScroll, setUsesNativeScroll] = useState(false);

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
