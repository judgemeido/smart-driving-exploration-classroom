import { expect, it } from 'vitest';
import { renderArchive, renderTimeline } from '../../../src/chapters/history/render';
import { archiveAssets, historyExhibits, type HistoryExhibit } from '../../../src/chapters/history/data';

const exhibits: HistoryExhibit[] = [
  {
    id: 'early',
    year: '2001',
    title: '起点',
    track: 'auto',
    detail: '说明一',
    story: '故事一',
    eventTitles: [],
    imageTitle: '照片',
    badge: '里程碑',
  },
  {
    id: 'future',
    year: '未来',
    title: '展望',
    track: 'ai',
    detail: '说明二',
    story: '故事二',
    eventTitles: [],
  },
];

it('connects each timeline button to the corresponding article in input order', () => {
  expect([...renderTimeline(exhibits).matchAll(/data-timeline-target="([^"]+)"/g)].map((m) => m[1])).toEqual([
    'early',
    'future',
  ]);
  expect(
    [...renderArchive(exhibits, {}).matchAll(/id="([^"]+)" data-archive-article/g)].map((m) => m[1]),
  ).toEqual(['early', 'future']);
  expect(renderTimeline(exhibits)).toContain('<span class="event-year">2001</span>');
});

it('renders an available image with title fallback, caption and badge', () => {
  const result = renderArchive(exhibits.slice(0, 1), {
    照片: { image: '/example.jpg', caption: '档案说明' },
  });
  expect(result).toContain('src="/example.jpg" alt="起点" loading="lazy" decoding="async" draggable="false"');
  expect(result).toContain('/example-480.webp 480w, /example-960.webp 960w');
  expect(result).toContain('<figcaption>档案说明</figcaption>');
  expect(result).toContain('<span class="archive-article__badge">里程碑</span>');
  expect(result).toContain('<p class="archive-article__story">故事一</p>');
});

it('keeps the existing archive placeholder when a mapping or image is absent', () => {
  for (const assets of [{}, { 照片: { caption: '仅有说明' } }]) {
    const result = renderArchive(exhibits, assets);
    expect(result.match(/archive-article__media--empty/g)).toHaveLength(2);
    expect(result).toContain('<strong>未来展望</strong>');
    expect(result).not.toContain('<img');
  }
});

it('renders all current exhibits without mutating the content or archive mapping', () => {
  const before = JSON.stringify({ historyExhibits, archiveAssets });
  const timeline = renderTimeline(historyExhibits);
  const articles = renderArchive(historyExhibits, archiveAssets);
  expect(timeline.match(/data-timeline-target=/g)).toHaveLength(23);
  expect(articles.match(/data-archive-article/g)).toHaveLength(23);
  expect(JSON.stringify({ historyExhibits, archiveAssets })).toBe(before);
});
