import type { ArcadeResult, Persistence } from '../../shared/arcade/types';
export function describeArcadeResult(result: ArcadeResult) {
  const title =
    result.status === 'interrupted'
      ? '本次挑战已中断'
      : result.status === 'abandoned'
        ? '本次操作已结束'
        : result.status === 'timeout'
          ? '时间到'
          : result.config.mode === 'practice'
            ? '练习完成'
            : '挑战完成';
  return {
    title,
    total: result.score ? `${result.score.total} 分` : '观察记录',
    completion: `${result.objectives.filter((o) => o.completed).length} / ${result.objectives.length} 个目标已完成`,
    timing: result.elapsedMs === null ? '不限时练习' : `${(result.elapsedMs / 1000).toFixed(1)} 秒`,
    parts: result.score
      ? `探索完成 ${result.score.progress} · 首次验证 ${result.score.quality} · 时间奖励 ${result.score.efficiency}`
      : '练习和中断记录不参与正式成绩比较',
  };
}
export function renderArcadeResult(host: HTMLElement, result: ArcadeResult, persistence: Persistence): void {
  const text = describeArcadeResult(result);
  host.replaceChildren();
  host.classList.add('arcade-result');
  const append = (tag: string, value: string, className?: string) => {
    const el = document.createElement(tag);
    el.textContent = value;
    if (className) el.className = className;
    host.append(el);
    return el;
  };
  append('h2', text.title);
  append('p', text.total, 'arcade-result__total');
  append('p', text.completion);
  append('p', text.parts);
  append('p', text.timing);
  append(
    'p',
    persistence === 'saved'
      ? '已保存在此浏览器。本机记录不会同步到其他电脑。'
      : '本次成绩可查看，本机未保存。刷新可能丢失记录。',
    'arcade-save-status',
  );
  const metadata = document.createElement('details');
  const metadataSummary = document.createElement('summary');
  metadataSummary.textContent = '查看挑战码与成绩说明';
  metadata.append(metadataSummary);
  host.append(metadata);
  const firstMetadataIndex = host.children.length;
  append(
    'p',
    `代号：${result.config.nickname} · ${result.config.profile === 'guided' ? '引导档' : '标准档'} · ${result.config.mode === 'contest' ? '正式挑战' : '练习'}`,
  );
  append('p', `挑战码：${result.config.challengeCode}`);
  append(
    'p',
    `内容 ${result.config.contentVersion} / 评分 ${result.config.scoringVersion} / ${result.config.durationMs === null ? '不限时' : result.config.durationMs / 1000 + '秒'}`,
    'arcade-small',
  );
  append(
    'p',
    result.eligible
      ? '同活动、同码、同档位与同版本的首轮正式成绩可并排核对。'
      : '这是一份观察记录，不是可比较的正式成绩。',
  );
  append('p', '纠正后完成也能获得探索分。完成前查看答案提示会影响该目标的首次验证分。', 'arcade-small');
  while (host.children.length > firstMetadataIndex) metadata.append(host.children[firstMetadataIndex]);
}
