import { useEffect, useState } from 'react';

const TOUCH_WIDGET_QUERY = '(hover: none) and (pointer: coarse)';

export function useMobileWidgetLayout() {
  const [usesMobileLayout, setUsesMobileLayout] = useState(false);

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
