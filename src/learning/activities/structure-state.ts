export const parts = {
  battery: '动力电池',
  motor: '驱动电机',
  transmission: '传动系统',
  compute: '计算单元',
  sensor: '环境传感器',
  brake: '制动系统',
} as const;
export type Part = keyof typeof parts;
export type Fault = 'none' | 'input' | 'compute' | 'actuator';
export type Rule = 'yield' | 'park' | 'always-go';
export interface StructureDraft {
  selected: Part;
  exploded: boolean;
  cutaway: boolean;
  power: boolean;
  transmission: boolean;
  fault: Fault;
  rule: Rule;
  step: number;
  diagnosis: Fault;
}
export function parseStructureDraft(value: unknown): StructureDraft {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const faults = ['none', 'input', 'compute', 'actuator'];
  return {
    selected:
      typeof v.selected === 'string' && Object.hasOwn(parts, v.selected) ? (v.selected as Part) : 'motor',
    exploded: v.exploded === true,
    cutaway: v.cutaway === true,
    power: typeof v.power === 'boolean' ? v.power : true,
    transmission: typeof v.transmission === 'boolean' ? v.transmission : true,
    fault: faults.includes(v.fault as string) ? (v.fault as Fault) : 'actuator',
    rule: ['yield', 'park', 'always-go'].includes(v.rule as string) ? (v.rule as Rule) : 'yield',
    step: v.step === 1 || v.step === 2 || v.step === 3 ? v.step : 0,
    diagnosis: faults.includes(v.diagnosis as string) ? (v.diagnosis as Fault) : 'none',
  };
}
export function inspectPart(part: Part, power: boolean, transmission: boolean): string {
  const descriptions: Record<Part, string> = {
    battery: power ? '动力电池向电机和控制系统供电。' : '电源断开，电机无法获得驱动能量。',
    motor: !power
      ? '电源断开，电机不产生驱动力。'
      : transmission
        ? '电机把电能转为转动，通过传动系统带动车轮。'
        : '电机可以转动，但传动断开，车轮得不到驱动力。',
    transmission: transmission ? '传动系统把电机的转动传给车轮。' : '传动断开：电机转动不等于车轮转动。',
    compute: '计算单元根据传感证据和规则生成命令，不直接推动车轮。',
    sensor: '环境传感器提供证据，测不到不代表前方一定没有障碍。',
    brake: '制动系统接收停车命令，作用于车轮，减少车辆运动。',
  };
  return descriptions[part];
}
export interface ChainFrame {
  evidence: 'pedestrian' | 'clear' | 'uncertain';
  command: 'stop' | 'go' | null;
  execution: 'stop' | 'go' | null;
}
export function runChain(config: Pick<StructureDraft, 'fault' | 'rule' | 'power' | 'transmission'>) {
  const frames: ChainFrame[] = (['pedestrian', 'clear'] as const).map((actual) => {
    const evidence = config.fault === 'input' ? 'uncertain' : actual;
    const command =
      config.fault === 'compute'
        ? null
        : config.rule === 'park'
          ? 'stop'
          : config.rule === 'always-go'
            ? 'go'
            : evidence === 'clear'
              ? 'go'
              : 'stop';
    const execution = config.fault === 'actuator' || !config.power || !config.transmission ? null : command;
    return { evidence, command, execution };
  });
  return {
    frames,
    safe: frames[0].execution === 'stop',
    completed: frames[0].execution === 'stop' && frames[1].execution === 'go',
  };
}
