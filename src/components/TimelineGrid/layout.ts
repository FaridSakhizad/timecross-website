export type TimelineGridLayout = 'auto' | 'desktop' | 'mobile';

/** The view to show: a forced one, or for "auto" the touch view on touch devices. */
export function resolveTimelineGridLayout(layout: TimelineGridLayout, touchLayout: boolean): 'desktop' | 'mobile' {
  if (layout !== 'auto') {
    return layout;
  }

  return touchLayout ? 'mobile' : 'desktop';
}
