import { useEffect, useRef } from 'react';

export function useMobileGridHorizontalScrollLock(enabled: boolean) {
  const lockedScrollXRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let animationFrame = 0;
    const pageScroller = document.scrollingElement;

    if (!pageScroller) {
      return undefined;
    }

    lockedScrollXRef.current = pageScroller.scrollLeft;

    const lockScrollX = () => {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;

        if (Math.abs(pageScroller.scrollLeft - lockedScrollXRef.current) <= 0.5) {
          return;
        }

        pageScroller.scrollLeft = lockedScrollXRef.current;
      });
    };

    window.addEventListener('scroll', lockScrollX, { passive: true });

    lockScrollX();

    return () => {
      window.removeEventListener('scroll', lockScrollX);

      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [enabled]);
}
