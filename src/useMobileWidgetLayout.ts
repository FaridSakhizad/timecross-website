import { useEffect, useState } from 'react';

const TOUCH_WIDGET_QUERY = '(hover: none) and (pointer: coarse)';

export function useMobileWidgetLayout() {
  // Widgets mount through ClientOnly; SSR fallback also keeps isolated server renders safe.
  const [usesMobileLayout, setUsesMobileLayout] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(TOUCH_WIDGET_QUERY).matches);

  useEffect(() => {
    const touchMediaQuery = window.matchMedia(TOUCH_WIDGET_QUERY);

    const updateUsesMobileLayout = () => {
      setUsesMobileLayout(touchMediaQuery.matches);
    };

    updateUsesMobileLayout();
    touchMediaQuery.addEventListener('change', updateUsesMobileLayout);

    return () => {
      touchMediaQuery.removeEventListener('change', updateUsesMobileLayout);
    };
  }, []);

  return usesMobileLayout;
}
