import type { ActivityId, Observation } from '../types';
export interface SensorDraft {
  sensor: 'camera' | 'radar' | 'lidar';
  distance: number;
  angle: number;
  occluded: boolean;
  weather: 'clear' | 'rain' | 'fog';
  showRay: boolean;
  cutaway: boolean;
  selected: string;
}
export interface SensorTrace {
  status: 'available' | 'occluded' | 'miss' | 'unknown';
  distance: number | null;
  timeNs: number | null;
}
export const SENSOR_GEOMETRY = {
  targetHalfWidth: 2,
  occluderDistance: 8,
  occluderHalfWidth: 2,
  lightSpeed: 299792458,
} as const;
export function normalizeSensorDraft(input: unknown): SensorDraft {
  const p = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const number = (key: string, min: number, max: number, fallback: number) =>
    typeof p[key] === 'number' &&
    Number.isFinite(p[key]) &&
    (p[key] as number) >= min &&
    (p[key] as number) <= max
      ? (p[key] as number)
      : fallback;
  return {
    sensor: p.sensor === 'camera' || p.sensor === 'radar' ? p.sensor : 'lidar',
    distance: number('distance', 4, 80, 16),
    angle: number('angle', -30, 30, 0),
    occluded: p.occluded === true,
    weather: p.weather === 'rain' || p.weather === 'fog' ? p.weather : 'clear',
    showRay: p.showRay !== false,
    cutaway: p.cutaway === true,
    selected: p.selected === 'sensor' ? 'sensor' : 'target',
  };
}
export function traceSensor(draft: SensorDraft): SensorTrace {
  const a = (draft.angle * Math.PI) / 180;
  // A slab at x=distance; range is the actual ray path, not its x projection.
  const blocked = draft.occluded && draft.distance > 8 && Math.abs(8 * Math.tan(a)) <= 2;
  const hit = Math.abs(draft.distance * Math.tan(a)) <= 2;
  if (draft.weather === 'fog') return { status: 'unknown', distance: null, timeNs: null };
  if (!blocked && !hit) return { status: 'miss', distance: null, timeNs: null };
  const distance = (blocked ? 8 : draft.distance) / Math.cos(a);
  return {
    status: blocked ? 'occluded' : 'available',
    distance,
    timeNs: ((2 * distance) / SENSOR_GEOMETRY.lightSpeed) * 1e9,
  };
}
const devices = {
  camera: {
    name: '摄像头',
    info: '图像、颜色与纹理',
    limit: '颜色需要可见光与清晰视野；图像本身不是本实验的直接距离读数。',
  },
  radar: { name: '毫米波雷达', info: '距离与相对运动', limit: '这里未模拟测速；雷达不直接读交通灯灯色。' },
  lidar: { name: '激光雷达', info: '距离与轮廓', limit: '距离点组成轮廓；激光雷达不直接读交通灯灯色。' },
};
export function sensorObservation(id: ActivityId, draft: SensorDraft): Observation {
  const device = devices[draft.sensor],
    r = traceSensor(draft);
  if (id === 'S1')
    return {
      title: `${device.name}的信息证据`,
      summary: `${device.name}提供${device.info}。把不同信息拼起来，才能更完整地理解场景。`,
      metrics: [
        { label: '信息类型', value: device.info },
        {
          label: '测量方式',
          value:
            draft.sensor === 'camera'
              ? '接收可见光形成图像'
              : draft.sensor === 'radar'
                ? '发射并接收无线电波'
                : '发射并接收激光脉冲',
        },
      ],
      notes: [device.limit, '这是设备原理对照，不模拟真实识别算法或识别率。'],
      valid: true,
    };
  const status = {
    available: '目标回波可用',
    occluded: '先收到遮挡物回波',
    miss: '射线未命中表面',
    unknown: '浓雾：目标状态未知',
  }[r.status];
  return {
    title: id === 'S2' ? '往返时间测距' : '天气与遮挡对照',
    summary:
      r.status === 'unknown'
        ? '信号不足，前方目标状态未知；不能据此判断道路为空。'
        : r.status === 'miss'
          ? '本束光没有命中；没有读数不代表目标不存在。'
          : r.status === 'occluded'
            ? '回波来自近处遮挡物，不能把它解释成后方目标的距离。'
            : `测得射线路径距离 ${r.distance!.toFixed(2)} m，光往返时间 ${r.timeNs!.toFixed(1)} ns。`,
    metrics: [
      { label: '回波状态', value: status },
      {
        label: '射线路径距离',
        value: r.distance === null ? '—（无有效读数）' : `${r.distance.toFixed(2)} m`,
      },
      { label: '往返时间', value: r.timeNs === null ? '—（无有效读数）' : `${r.timeNs.toFixed(1)} ns` },
      {
        label: '天气 / 遮挡',
        value: `${{ clear: '晴朗', rain: '轻雨', fog: '浓雾' }[draft.weather]} / ${draft.occluded ? '有' : '无'}`,
      },
    ],
    notes: [
      '公式：t = 2d / c，c = 299 792 458 m/s；d 是沿光束到首个表面的单程距离。',
      '教学几何：目标半宽2m；遮挡物在前方8m、半宽2m；偏转角改变命中与路径长度。',
      id === 'S3'
        ? '定性教学样例：轻雨仍可能有可用回波；浓雾本例记为未知。真实效果还取决于设备、雨雾浓度、材质和算法。'
        : '动画为示意慢放；不是光在真实时间尺度中的传播速度。',
    ],
    valid: true,
  };
}
