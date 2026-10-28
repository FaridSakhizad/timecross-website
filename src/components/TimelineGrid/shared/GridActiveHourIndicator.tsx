import { useI18n } from '../../../i18n';
import type { TimelineGridActiveHourDirection } from './useGridActiveHourIndicator';

type TimelineGridActiveHourIndicatorProps = {
  direction: TimelineGridActiveHourDirection;
  onClick: () => void;
};

export default function TimelineGridActiveHourIndicator({
  direction,
  onClick,
}: TimelineGridActiveHourIndicatorProps) {
  const { t } = useI18n();

  if (!direction) {
    return null;
  }

  return (
    <button
      className={[
        'timelineGridActiveHourIndicator',
        direction === 'left'
          ? 'timelineGridActiveHourIndicator_left'
          : 'timelineGridActiveHourIndicator_right',
      ].join(' ')}
      type="button"
      aria-label={t('common.showCurrentHour')}
      onClick={onClick}
    >
      <svg
        className="timelineGridActiveHourIndicator-icon"
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
