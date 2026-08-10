import { TIMELINE_HOUR_WIDTH } from './constants';

export function getTimelineSidePad(viewport: HTMLDivElement) {
  return Math.max(0, viewport.clientWidth / 2 - TIMELINE_HOUR_WIDTH / 2);
}

export function getTimelineHourIndexAtCenter(viewport: HTMLDivElement) {
  const centerX = viewport.scrollLeft + viewport.clientWidth / 2;

  return Math.round(
    (centerX - getTimelineSidePad(viewport) - TIMELINE_HOUR_WIDTH / 2) / TIMELINE_HOUR_WIDTH,
  );
}

export function getBoundedTimelineHourIndex(
  hourIndex: number,
  minHourIndex: number,
  maxHourIndex: number,
) {
  return Math.max(minHourIndex, Math.min(maxHourIndex, hourIndex));
}

export function getTimelineScrollLeftForHourIndex(
  viewport: HTMLDivElement,
  hourIndex: number,
) {
  return getTimelineSidePad(viewport)
    + hourIndex * TIMELINE_HOUR_WIDTH
    + TIMELINE_HOUR_WIDTH / 2
    - viewport.clientWidth / 2;
}

export function getClampedTimelineScrollLeftForHourIndex(
  viewport: HTMLDivElement,
  hourIndex: number,
  minHourIndex: number,
  maxHourIndex: number,
) {
  const scrollLeft = getTimelineScrollLeftForHourIndex(
    viewport,
    getBoundedTimelineHourIndex(hourIndex, minHourIndex, maxHourIndex),
  );
  const minScrollLeft = getTimelineScrollLeftForHourIndex(viewport, minHourIndex);
  const maxScrollLeft = getTimelineScrollLeftForHourIndex(viewport, maxHourIndex);

  return Math.max(minScrollLeft, Math.min(maxScrollLeft, scrollLeft));
}

export function getTimelineEaseOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
}
