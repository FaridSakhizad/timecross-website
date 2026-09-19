import { useEffect, useState } from 'react';

const MOBILE_WIDGET_WIDTH_QUERY = '(width < 720px)';
const TOUCH_WIDGET_QUERY = '(hover: none) and (pointer: coarse)';

export function useMobileWidgetLayout() {
  const [usesMobileLayout, setUsesMobileLayout] = useState(false);

  useEffect(() => {
    const widthMediaQuery = window.matchMedia(MOBILE_WIDGET_WIDTH_QUERY);
    const touchMediaQuery = window.matchMedia(TOUCH_WIDGET_QUERY);
    const updateUsesMobileLayout = () => {
      setUsesMobileLayout(widthMediaQuery.matches || touchMediaQuery.matches);
    };

    updateUsesMobileLayout();
    widthMediaQuery.addEventListener('change', updateUsesMobileLayout);
    touchMediaQuery.addEventListener('change', updateUsesMobileLayout);

    return () => {
      widthMediaQuery.removeEventListener('change', updateUsesMobileLayout);
      touchMediaQuery.removeEventListener('change', updateUsesMobileLayout);
    };
  }, []);

  return usesMobileLayout;
}
