import { useEffect, useState } from 'react';

const MINUTE_MS = 60_000;
const TIMER_ALIGNMENT_DELAY_MS = 20;

function getNextMinuteDelay() {
  return MINUTE_MS - (Date.now() % MINUTE_MS) + TIMER_ALIGNMENT_DELAY_MS;
}

export function useCurrentMinuteDate() {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    let timeoutId = 0;

    const updateCurrentDate = () => {
      setCurrentDate(new Date());
    };

    const scheduleNextMinuteUpdate = () => {
      window.clearTimeout(timeoutId);

      timeoutId = window.setTimeout(() => {
        updateCurrentDate();
        scheduleNextMinuteUpdate();
      }, getNextMinuteDelay());
    };

    const handlePageResume = () => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      updateCurrentDate();
      scheduleNextMinuteUpdate();
    };

    scheduleNextMinuteUpdate();
    window.addEventListener('focus', handlePageResume);
    document.addEventListener('visibilitychange', handlePageResume);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('focus', handlePageResume);
      document.removeEventListener('visibilitychange', handlePageResume);
    };
  }, []);

  return currentDate;
}
