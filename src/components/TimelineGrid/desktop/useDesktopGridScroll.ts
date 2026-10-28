import { useCallback, type RefObject } from 'react';
import { useTimelineGridSnap } from '../shared/useGridScrollSnap';
import { useTimelineGridActiveHourIndicator } from '../shared/useGridActiveHourIndicator';

function useElementScrollTarget(viewportRef: RefObject<HTMLDivElement | null>) {
  return useCallback(() => viewportRef.current
    ? { type: 'element' as const, element: viewportRef.current }
    : null, [viewportRef]);
}

export function useDesktopGridSnap(viewportRef: RefObject<HTMLDivElement | null>,
  currentHourIndex: number, disabled: boolean, shouldSuspend: () => boolean,
  initialFocusHourIndex?: number, onHourChange?: (index: number) => void) {
  const getScrollTarget = useElementScrollTarget(viewportRef);
  return useTimelineGridSnap(getScrollTarget, currentHourIndex, disabled, shouldSuspend,
    initialFocusHourIndex, onHourChange);
}

export function useDesktopGridActiveHourIndicator(viewportRef: RefObject<HTMLDivElement | null>, disabled: boolean) {
  const getScrollTarget = useElementScrollTarget(viewportRef);
  return useTimelineGridActiveHourIndicator(getScrollTarget, disabled);
}
