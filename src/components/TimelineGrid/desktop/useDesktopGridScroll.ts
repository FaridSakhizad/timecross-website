import { useCallback, type RefObject } from 'react';

import { useTimelineGridActiveHourIndicator } from '../shared/useGridActiveHourIndicator';
import { useTimelineGridScrollPosition } from '../shared/useGridScrollPosition';

function useElementScrollTarget(viewportRef: RefObject<HTMLDivElement | null>) {
  return useCallback(() => (viewportRef.current
    ? { type: 'element' as const, element: viewportRef.current }
    : null), [viewportRef]);
}

export function useDesktopGridScrollPosition(
  viewportRef: RefObject<HTMLDivElement | null>,
  currentHourIndex: number,
  disabled: boolean,
  isInteracting: () => boolean,
  initialFocusHourIndex?: number,
  onHourChange?: (index: number) => void,
) {
  const getScrollTarget = useElementScrollTarget(viewportRef);

  return useTimelineGridScrollPosition(getScrollTarget, currentHourIndex, disabled, isInteracting, initialFocusHourIndex, onHourChange);
}

export function useDesktopGridActiveHourIndicator(viewportRef: RefObject<HTMLDivElement | null>, disabled: boolean) {
  const getScrollTarget = useElementScrollTarget(viewportRef);

  return useTimelineGridActiveHourIndicator(getScrollTarget, disabled);
}
