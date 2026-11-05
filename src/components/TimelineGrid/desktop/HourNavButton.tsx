import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { RefObject } from 'react';

import { useI18n } from '../../../i18n';
import { TIMELINE_HOUR_WIDTH } from '../shared/constants';

type HourNavButtonProps = {
  direction: 'prev' | 'next';
  viewportRef: RefObject<HTMLDivElement | null>;
};

/** Scrolls the grid one hour back or forward. */
export default function HourNavButton({ direction, viewportRef }: HourNavButtonProps) {
  const { t } = useI18n();
  const label = t(direction === 'prev' ? 'common.previousHour' : 'common.nextHour');
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;

  return (
    <button
      className={`timelinesNav timelinesNav_${direction}`}
      type="button"
      aria-label={label}
      title={label}
      onClick={() => viewportRef.current?.scrollBy({
        left: direction === 'prev' ? -TIMELINE_HOUR_WIDTH : TIMELINE_HOUR_WIDTH,
        behavior: 'smooth',
      })}
    >
      <Icon
        size={36}
        aria-hidden="true"
      />
    </button>
  );
}
