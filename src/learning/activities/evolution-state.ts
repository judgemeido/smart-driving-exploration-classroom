export const evolutionEras = [
  {
    id: 'pioneer',
    label: '1886 · 燃油三轮先驱',
    wheels: 3,
    energy: 'fuel',
    need: '让车辆依靠自身动力前进',
    added: '车架、转向与燃油发动机结合，形成三轮机动车。',
    path: '燃料 → 发动机 → 传动 → 后轮',
  },
  {
    id: 'early-electric',
    label: '约1900 · 早期电动车',
    wheels: 4,
    energy: 'electric',
    need: '城市短途与较安静的乘坐',
    added: '电池与电机驱动马车式车厢；续航、重量与补能限制使用范围。',
    path: '电池 → 电机 → 传动 → 后轮',
  },
  {
    id: 'hybrid',
    label: '1997 · 混动轿车',
    wheels: 4,
    energy: 'hybrid',
    need: '降低城市行驶中的燃油消耗',
    added: '发动机与电机协作。不同混动车的动力分配和充电方式不同。',
    path: '燃料＋电池 → 发动机＋电机 → 传动 → 车轮',
  },
  {
    id: 'modern-ev',
    label: '当代 · 智能纯电车',
    wheels: 4,
    energy: 'electric',
    need: '电动出行与辅助观察道路',
    added: '底盘电池供能，传感器提供道路信息；感知能力不等于能够自动安全驾驶。',
    path: '电池 → 电控 → 电机 → 传动 → 车轮',
  },
] as const;
export type VehicleEra = (typeof evolutionEras)[number]['id'];
export interface EvolutionDraft extends Record<string, unknown> {
  evolution: {
    era: VehicleEra;
    visited: VehicleEra[];
    running: boolean;
    open: boolean;
    demonstrated: boolean;
  };
}
export function restoreEvolutionDraft(raw: unknown): EvolutionDraft {
  const old = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const e =
    old.evolution && typeof old.evolution === 'object' ? (old.evolution as Record<string, unknown>) : {};
  const ids = evolutionEras.map((x) => x.id);
  const era = ids.includes(e.era as VehicleEra) ? (e.era as VehicleEra) : 'modern-ev';
  return {
    ...old,
    evolution: {
      era,
      visited: Array.isArray(e.visited)
        ? [...new Set(e.visited.filter((x): x is VehicleEra => ids.includes(x as VehicleEra)))]
        : [era],
      running: e.running === true,
      open: e.open === true,
      demonstrated: e.demonstrated === true,
    },
  };
}
export function evolutionEvidence(d: EvolutionDraft) {
  return new Set(d.evolution.visited).size >= 2 && d.evolution.demonstrated;
}
