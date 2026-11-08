export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  kind: 'gallery' | 'activity';
}
export interface NavigationGroup {
  number: string;
  title: string;
  items: readonly NavigationItem[];
}
export function siteHref(path: string, base: string = import.meta.env.BASE_URL): string {
  return `${base.endsWith('/') ? base : base + '/'}${path.replace(/^\//, '')}`;
}
export function getNavigationGroups(base: string = import.meta.env.BASE_URL): readonly NavigationGroup[] {
  return [
    {
      number: '01',
      title: '发展历史',
      items: [
        { id: 'history', label: '发展历史展厅', href: siteHref('index.html#history', base), kind: 'gallery' },
        {
          id: 'history-lab',
          label: '进化修复站',
          href: siteHref('games/history/index.html', base),
          kind: 'activity',
        },
      ],
    },
    {
      number: '02',
      title: '汽车结构',
      items: [
        {
          id: 'explore',
          label: '拆解与交互展厅',
          href: siteHref('index.html#explore', base),
          kind: 'gallery',
        },
        {
          id: 'structure-lab',
          label: '系统维修台',
          href: siteHref('games/structure/index.html', base),
          kind: 'activity',
        },
      ],
    },
    {
      number: '03',
      title: '激光雷达',
      items: [
        { id: 'lidar', label: '感知原理互动展', href: siteHref('index.html#lidar', base), kind: 'gallery' },
        {
          id: 'sensor-lab',
          label: '回波侦探',
          href: siteHref('games/sensor/index.html', base),
          kind: 'activity',
        },
      ],
    },
    {
      number: '04',
      title: '安全上路',
      items: [
        { id: 'traffic', label: '道路规则体验', href: siteHref('index.html#traffic', base), kind: 'gallery' },
      ],
    },
  ];
}
