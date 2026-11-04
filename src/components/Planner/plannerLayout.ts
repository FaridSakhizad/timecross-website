export type PlannerLayout = 'auto' | 'desktop' | 'mobile';

export function resolvePlannerLayout(layout: PlannerLayout, touchLayout: boolean): 'desktop' | 'mobile' {
  if (layout !== 'auto') {
    return layout;
  }

  return touchLayout ? 'mobile' : 'desktop';
}
