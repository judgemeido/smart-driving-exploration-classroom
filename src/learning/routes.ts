import { activities } from './catalog';
import type { ActivityId } from './types';
export type Route = ActivityId | 'traffic' | 'report' | 'Q1' | 'Q2';
export function parseRoute(hash: string): Route {
  const [root, child] = hash.replace(/^#/, '').split('/');
  if (root === 'knowledge') return child === 'Q2' ? 'Q2' : 'Q1';
  if (root === 'traffic' || root === 'report') return root;
  const first = activities.find((a) => a.section === root);
  return activities.find((a) => a.id === child && a.section === root)?.id ?? first?.id ?? 'B1';
}
export function routeHash(id: Route): string {
  if (id === 'Q1' || id === 'Q2') return `#knowledge/${id}`;
  const activity = activities.find((a) => a.id === id);
  return activity ? `#${activity.section}/${activity.id}` : `#${id}`;
}
