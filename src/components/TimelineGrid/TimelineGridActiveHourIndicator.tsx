import type { TimelineGridActiveHourDirection } from './useTimelineGridActiveHourIndicator';

type TimelineGridActiveHourIndicatorProps = {
  direction: TimelineGridActiveHourDirection;
};

export default function TimelineGridActiveHourIndicator({
  direction,
}: TimelineGridActiveHourIndicatorProps) {
  if (!direction) {
    return null;
  }

  return (
    <div
      className={[
        'timelineGridActiveHourIndicator',
        direction === 'left'
          ? 'timelineGridActiveHourIndicator_left'
          : 'timelineGridActiveHourIndicator_right',
      ].join(' ')}
      aria-hidden="true"
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
    </div>
  );
}
