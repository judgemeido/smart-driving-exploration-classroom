export type KnowledgeId = 'Q1' | 'Q2';
export interface Question {
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
}
export const knowledgeQuestions: Record<KnowledgeId, Question[]> = {
  Q1: [
    {
      prompt: '台架电源接通，电机在转，车轮却不转。只断开哪一处能产生这组证据？',
      options: [
        '断开供能：电机和车轮都失去驱动能量',
        '断开传动：电机能转，车轮得不到传来的动力',
        '打开外壳：部件停止工作',
      ],
      correct: 1,
      explanation:
        '传动负责把电机转动传给车轮。供能断开时电机也不能持续产生驱动力；开壳只是观察方式。这里忽略惯性与滑行。',
    },
    {
      prompt: '检测到行人，计算单元已输出“停车”，执行反馈却为“无输出”。应优先检查哪一环？',
      options: ['输入环：一定没看到行人', '计算环：一定没产生停车命令', '执行环：命令存在，但还没有执行证据'],
      correct: 2,
      explanation:
        '已收到输入且已有命令，最先缺失的是执行反馈。有命令不等于已经停车；仍需修复并在相同场景重测。',
    },
    {
      prompt: '两帧任务先有行人，后确认清空。小车两帧始终停车，这能证明什么？',
      options: ['安全与通行任务都已完成', '第一帧停车符合礼让，但未完成第二帧通行', '没有任何证据可讨论'],
      correct: 1,
      explanation: '安全响应与任务完成分别评价。始终停车不能冒充“礼让后通行”；确认清空后还需完成通行。',
    },
  ],
  Q2: [
    {
      prompt: '已有距离读数，还想获得交通灯颜色的图像线索，应选择什么设备？',
      options: ['摄像头', '只用毫米波雷达距离读数', '只用激光雷达距离点'],
      correct: 0,
      explanation:
        '摄像头提供图像、颜色与纹理线索。距离信号不直接包含灯色；图像仍需处理，不能只凭设备名称保证识别正确。',
    },
    {
      prompt: '晴朗、无遮挡、正对目标。目标由16 m移到32 m，光往返时间怎样变化？',
      options: ['约减半', '约翻倍，从106.7 ns到213.5 ns', '始终相同'],
      correct: 1,
      explanation: 't = 2d/c。单程距离翻倍，往返路程和时间也翻倍；画面动画是慢放示意。',
    },
    {
      prompt: '本页浓雾样例没有可靠目标回波，可以直接说“前方无人，可以通行”吗？',
      options: [
        '可以，没回波就没有目标',
        '可以，只有显示路径关闭才会没回波',
        '不可以，目标状态未知，需要更多可靠证据',
      ],
      correct: 2,
      explanation: '信号不足不等于目标不存在。天气只是定性教学样例，真实结果依赖设备、浓度、材质与算法。',
    },
  ],
};
export interface KnowledgeRecord {
  answers: Array<number | null>;
  submitted: { answers: number[]; score: number } | null;
  reviewed: boolean;
  correction: string;
  correctionChoices?: Array<number | null>;
}
export interface KnowledgeData {
  version: 1;
  records: Record<KnowledgeId, KnowledgeRecord>;
}
export const freshKnowledge = (): KnowledgeRecord => ({
  answers: [null, null, null],
  submitted: null,
  reviewed: false,
  correction: '',
});
export function updateAnswer(record: KnowledgeRecord, index: number, value: number): KnowledgeRecord {
  if (record.submitted || index < 0 || index > 2 || !Number.isInteger(value) || value < 0 || value > 2)
    return record;
  const answers = [...record.answers];
  answers[index] = value;
  return { ...record, answers };
}
export function submitKnowledge(id: KnowledgeId, record: KnowledgeRecord): KnowledgeRecord {
  if (record.submitted || record.answers.some((a) => a === null)) return record;
  const answers = record.answers as number[];
  return {
    ...record,
    submitted: {
      answers: [...answers],
      score: answers.filter((a, i) => a === knowledgeQuestions[id][i].correct).length,
    },
  };
}
export function restoreKnowledge(raw: string | null): { data: KnowledgeData; protected: boolean } {
  const blank = (): KnowledgeData => ({
    version: 1,
    records: { Q1: freshKnowledge(), Q2: freshKnowledge() },
  });
  if (raw === null) return { data: blank(), protected: false };
  try {
    const input = JSON.parse(raw);
    if (
      !input ||
      input.version !== 1 ||
      !input.records ||
      typeof input.records !== 'object' ||
      Array.isArray(input.records) ||
      Object.keys(input.records).some((k) => k !== 'Q1' && k !== 'Q2')
    )
      throw Error();
    const data = blank();
    for (const id of ['Q1', 'Q2'] as const) {
      const r = input.records[id];
      if (r === undefined) continue;
      if (
        !r ||
        !Array.isArray(r.answers) ||
        r.answers.length !== 3 ||
        !r.answers.every(
          (a: unknown) => a === null || (Number.isInteger(a) && Number(a) >= 0 && Number(a) <= 2),
        ) ||
        typeof r.reviewed !== 'boolean' ||
        typeof r.correction !== 'string' ||
        r.correction.length > 2000 ||
        (r.correctionChoices !== undefined &&
          (!Array.isArray(r.correctionChoices) ||
            r.correctionChoices.length !== 3 ||
            !r.correctionChoices.every(
              (a: unknown) => a === null || (Number.isInteger(a) && Number(a) >= 0 && Number(a) <= 2),
            )))
      )
        throw Error();
      if (r.submitted !== null) {
        if (
          !r.submitted ||
          !Array.isArray(r.submitted.answers) ||
          r.submitted.answers.length !== 3 ||
          !r.submitted.answers.every((a: unknown, i: number) => Number.isInteger(a) && a === r.answers[i]) ||
          r.answers.some((a: unknown) => a === null)
        )
          throw Error();
        const expected = submitKnowledge(id, { ...r, submitted: null }).submitted!;
        if (r.submitted.score !== expected.score) throw Error();
      } else if (r.reviewed || r.correction || r.correctionChoices?.some((a: unknown) => a !== null))
        throw Error();
      if (!r.reviewed && r.correctionChoices?.some((a: unknown) => a !== null)) throw Error();
      data.records[id] = {
        answers: [...r.answers],
        submitted: r.submitted ? { answers: [...r.submitted.answers], score: r.submitted.score } : null,
        reviewed: r.reviewed,
        correction: r.correction,
        ...(r.correctionChoices ? { correctionChoices: [...r.correctionChoices] } : {}),
      };
    }
    return { data, protected: false };
  } catch {
    return { data: blank(), protected: true };
  }
}
