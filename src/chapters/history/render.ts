import type { ArchiveMeta, HistoryExhibit } from './data';

export function renderTimeline(exhibits: readonly HistoryExhibit[]): string {
  return exhibits
    .map(
      (exhibit) => `
    <button class="timeline-event${exhibit.mainline ? ' timeline-event--mainline' : ''}" type="button" data-timeline-target="${exhibit.id}">
      <span class="event-year">${exhibit.year}</span>
      ${exhibit.mainline ? `<span class="event-mainline">鸿蒙智行 · ${String(exhibit.mainline).padStart(2, '0')}</span>` : ''}
      <span class="event-title">${exhibit.title}</span>
    </button>
  `,
    )
    .join('');
}

export function renderMainline(exhibits: readonly HistoryExhibit[]): string {
  return exhibits.filter(exhibit => exhibit.mainline).map(exhibit => `
    <button class="history-mainline__stop" type="button" data-timeline-target="${exhibit.id}">
      <span>${String(exhibit.mainline).padStart(2, '0')} / ${exhibit.year}</span>
      <strong>${exhibit.title.split('：')[0]}</strong>
      <small>${exhibit.badge}</small>
    </button>`).join('');
}

export function renderArchive(
  exhibits: readonly HistoryExhibit[],
  assets: Readonly<Record<string, ArchiveMeta>>,
): string {
  return exhibits
    .map((exhibit) => {
      const archive = exhibit.imageTitle ? assets[exhibit.imageTitle] : undefined;
      const responsivePhoto = archive?.image?.match(/\.(jpe?g|png)$/i)
        ? `<source type="image/webp" srcset="${archive.image.replace(/\.(jpe?g|png)$/i, '-480.webp')} 480w, ${archive.image.replace(/\.(jpe?g|png)$/i, '-960.webp')} 960w" sizes="(max-width: 760px) 94vw, 45vw" />`
        : '';
      const imageMarkup = archive?.image
        ? `<figure class="archive-article__media"><picture>${responsivePhoto}<img src="${archive.image}" alt="${archive.imageAlt ?? exhibit.title}" loading="lazy" decoding="async" draggable="false" /></picture><figcaption>${archive.caption ?? ''}</figcaption></figure>`
        : `<div class="archive-article__media archive-article__media--empty"><span>ARCHIVE NOTE</span><strong>未来展望</strong><small>智能系统与人的监督一起守护出行安全。</small></div>`;
      return `
      <article class="archive-article archive-article--${exhibit.track}${exhibit.mainline ? ' archive-article--mainline' : ''}" id="${exhibit.id}" data-archive-article>
        <div class="archive-article__body">
          ${exhibit.mainline ? `<p class="archive-mainline-label">鸿蒙智行主线 <span>${String(exhibit.mainline).padStart(2, '0')} / 05</span></p>` : ''}
          <div class="archive-article__heading"><span class="archive-article__year">${exhibit.year}</span><h3>${exhibit.title}</h3>${exhibit.badge ? `<span class="archive-article__badge">${exhibit.badge}</span>` : ''}</div>
          <div class="archive-article__grid">
            ${imageMarkup}
            <div class="archive-article__copy">
              <p class="archive-article__detail">${exhibit.detail}</p>
              <p class="archive-article__story">${exhibit.story}</p>
            </div>
          </div>
        </div>
      </article>`;
    })
    .join('');
}
