import { useI18n } from '../../i18n';
import type { TimelineActiveHourDirection } from './useTimelineActiveHourIndicator';

type TimelineActiveHourIndicatorProps = {
  direction: TimelineActiveHourDirection;
  onClick: () => void;
};

export default function TimelineActiveHourIndicator({
  direction,
  onClick,
}: TimelineActiveHourIndicatorProps) {
  const { t } = useI18n();

  if (!direction) {
    return null;
  }

  return (
    <button
      className={[
        'timelineActiveHourIndicator',
        direction === 'left'
          ? 'timelineActiveHourIndicator_left'
          : 'timelineActiveHourIndicator_right',
      ].join(' ')}
      type="button"
      aria-label={t('common.showCurrentHour')}
      onClick={onClick}
    >
      <svg
        className="timelineActiveHourIndicator-icon"
        width="24"
        height="100"
        viewBox="0 0 24 100"
        focusable="false"
      >
        <path d={direction === 'left' ? 'M18 8L6 50l12 42' : 'M6 8l12 42L6 92'} />
      </svg>
    </button>
  );
}
