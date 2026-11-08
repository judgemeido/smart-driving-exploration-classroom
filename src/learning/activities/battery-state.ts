import type { Observation } from '../types';

export const batteryTypes = {
  'lead-acid': {
    name: '铅酸电池',
    era: '1859 年发明',
    form: '六格方盒 · 顶部双端子',
    chemistry: '铅与二氧化铅电极，硫酸电解液',
    use: '汽车启动电源、备用电源',
    tradeoff: '技术成熟、成本较低；但较重，需要规范回收含铅材料。',
  },
  nimh: {
    name: '镍氢电池',
    era: '20 世纪末广泛应用',
    form: '圆柱单体 · 成组连接',
    chemistry: '镍基正极与储氢合金负极，碱性电解液',
    use: '部分混合动力汽车、可充电日用品',
    tradeoff: '耐反复充放电；但同样储能通常比锂离子方案更重。',
  },
  lfp: {
    name: '磷酸铁锂电池',
    era: '如今并行选择',
    form: '长方形单体 · 平整壳体',
    chemistry: '磷酸铁锂正极与石墨负极，锂离子在两极间移动',
    use: '电动汽车、储能系统',
    tradeoff: '热稳定性较好、寿命表现较好；但同样重量储能通常少于三元方案，低温也需管理。',
  },
  nmc: {
    name: '三元锂电池',
    era: '如今并行选择',
    form: '圆柱单体 · 卷绕电极',
    chemistry: '镍钴锰氧化物正极与石墨负极，锂离子在两极间移动',
    use: '电动汽车等',
    tradeoff: '同样重量通常能储存更多能量；但对温度管理和保护系统要求较高。',
  },
} as const;
export type BatteryType = keyof typeof batteryTypes;
export type BatteryFlow = 'rest' | 'charge' | 'discharge';
export const batteryParts = ['overview', 'cell', 'electrodes', 'separator', 'terminals', 'pack'] as const;
export interface BatteryDraft {
  batteryType: BatteryType;
  flow: BatteryFlow;
  selected: string;
}
export function parseBatteryDraft(value: unknown): BatteryDraft {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    batteryType:
      typeof v.batteryType === 'string' && Object.hasOwn(batteryTypes, v.batteryType)
        ? (v.batteryType as BatteryType)
        : 'lead-acid',
    flow: v.flow === 'charge' || v.flow === 'discharge' ? v.flow : 'rest',
    selected:
      typeof v.selected === 'string' && (batteryParts as readonly string[]).includes(v.selected)
        ? v.selected
        : 'overview',
  };
}
export function batteryDirection(flow: BatteryFlow): string {
  return flow === 'charge' ? '充电器 → 电池' : flow === 'discharge' ? '电池 → 用电器' : '未连接外部电路';
}
export function batteryObservation(state: BatteryDraft): Observation {
  const info = batteryTypes[state.batteryType];
  return {
    title: '电池观察记录',
    summary: `${info.name}：${batteryDirection(state.flow)}。${info.tradeoff}`,
    valid: true,
    metrics: [
      { label: '电池类型', value: info.name },
      { label: '能量方向', value: batteryDirection(state.flow) },
      { label: '结构线索', value: info.form },
    ],
    notes: [
      info.chemistry,
      `用途举例：${info.use}。`,
      '模型为结构与能量方向示意，外形不唯一，不按比例，不计算续航；充放电需匹配的保护与管理系统。',
      '1859 年铅酸电池诞生；20 世纪末镍氢电池兴起，1991 年锂离子电池商业化。如今磷酸铁锂与三元锂是并行选择的锂离子电池分支，并非谁完全替代谁。',
    ],
  };
}
