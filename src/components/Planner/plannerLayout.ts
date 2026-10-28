export type PlannerLayout = 'auto' | 'desktop' | 'mobile';

export function resolvePlannerLayout(layout: PlannerLayout, touchLayout: boolean): 'desktop' | 'mobile' {
  return layout === 'auto' ? touchLayout ? 'mobile' : 'desktop' : layout;
}
