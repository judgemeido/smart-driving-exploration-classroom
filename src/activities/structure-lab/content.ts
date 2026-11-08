import { diagramParts, type DiagramPart } from './parts';
import { getStructureSource } from './source';
export type StructureLabBoard = 'power' | 'support' | 'perception';
export interface DiagramSocket {
  readonly id: string;
  readonly partId: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly teachingOnly?: boolean;
}
export interface DiagramNode {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
}
export interface DiagramEdge {
  readonly sourceId: string;
  readonly targetId: string;
  readonly relationId: string;
}
export interface DiagramObjective {
  readonly id: string;
  readonly boardId: StructureLabBoard;
  readonly requiredSocketParts: Readonly<Record<string, string>>;
  readonly sourceTaskId?: string;
  readonly weight: number;
  readonly teachingOnly?: boolean;
}
export interface DiagramBoard {
  readonly id: StructureLabBoard;
  readonly title: string;
  readonly observation: string;
  readonly sockets: readonly DiagramSocket[];
  readonly nodes: readonly DiagramNode[];
  readonly requiredEdges: readonly DiagramEdge[];
}
export interface StructureLabContent {
  readonly parts: readonly DiagramPart[];
  readonly boards: readonly DiagramBoard[];
  readonly objectives: readonly DiagramObjective[];
}
export const relationLabels: Readonly<Record<string, string>> = {
  'electric-energy': '提供电能',
  rotation: '传递转动',
  'contact-force': '接触作用力',
  support: '支撑连接',
  'slow-rotation': '减慢转动',
  image: '图像信息',
  'laser-distance': '激光测距',
  'radio-target': '无线电目标信息',
  'near-distance': '近距信息',
  analysis: '分析后行动',
};
const socket = (
  board: string,
  id: string,
  part: string,
  label: string,
  x: number,
  y: number,
): DiagramSocket => ({
  id: `socket-${board}-${id}`,
  partId: `part-${part}`,
  label,
  x,
  y,
  teachingOnly: part === 'millimeter-teaching',
});
const edge = (source: string, target: string, relationId: string): DiagramEdge => ({
  sourceId: `node-${source}`,
  targetId: `node-${target}`,
  relationId,
});
const power = [
  socket('power', 'battery', 'battery', '储能位置', 260, 220),
  socket('power', 'motor', 'motor', '能量转化位置', 470, 200),
  socket('power', 'transmission', 'transmission', '传动位置', 640, 200),
  socket('power', 'wheel', 'wheel', '接触路面位置', 790, 270),
];
const support = [
  socket('support', 'body', 'body', '承载框架', 350, 110),
  socket('support', 'suspension', 'suspension', '缓和起伏位置', 420, 210),
  socket('support', 'brakes', 'brakes', '减速位置', 640, 210),
  socket('support', 'wheel', 'wheel', '轮胎接触位置', 790, 270),
];
const perception = [
  socket('sensor', 'front', 'camera-front', '前方图像', 700, 130),
  socket('sensor', 'surround', 'camera-surround', '侧后方图像', 190, 135),
  socket('sensor', 'lidar', 'lidar', '激光距离', 450, 65),
  socket('sensor', 'millimeter-teaching', 'millimeter-teaching', '无线电探测 · 教学示意', 730, 235),
  socket('sensor', 'near', 'ultrasonic', '近距离观察', 180, 245),
];
const nodeId: Readonly<Record<string, string>> = {
  'camera-front': 'front-camera',
  'camera-surround': 'surround-camera',
};
const nodes = (sockets: readonly DiagramSocket[]): DiagramNode[] =>
  sockets.map((s) => ({
    id: `node-${nodeId[s.partId.slice(5)] ?? s.partId.slice(5)}`,
    label: diagramParts.find((p) => p.id === s.partId)!.label,
    x: s.x,
    y: s.y,
  }));
export const structureBoards: readonly DiagramBoard[] = [
  {
    id: 'power',
    title: '动力台',
    observation: '电池储能 → 电机转动 → 机构传动 → 轮胎作用于路面。',
    sockets: power,
    nodes: [...nodes(power), { id: 'node-road', label: '路面', x: 560, y: 340 }],
    requiredEdges: [
      edge('battery', 'motor', 'electric-energy'),
      edge('motor', 'transmission', 'rotation'),
      edge('transmission', 'wheel', 'rotation'),
      edge('wheel', 'road', 'contact-force'),
    ],
  },
  {
    id: 'support',
    title: '支撑台',
    observation: '车身、悬架、制动各有分工。加速、转弯、减速都依赖轮胎与路面。',
    sockets: support,
    nodes: [...nodes(support), { id: 'node-road', label: '路面', x: 560, y: 340 }],
    requiredEdges: [
      edge('body', 'suspension', 'support'),
      edge('suspension', 'wheel', 'support'),
      edge('brakes', 'wheel', 'slow-rotation'),
      edge('wheel', 'road', 'contact-force'),
    ],
  },
  {
    id: 'perception',
    title: '感知台',
    observation: '先收集图像与不同回波，再由计算系统分析，配合合适的驾驶行动。设备不能保证所有风险都不存在。',
    sockets: perception,
    nodes: [
      ...nodes(perception),
      { id: 'node-processor', label: '计算分析', x: 450, y: 225 },
      { id: 'node-driver-action', label: '合适的驾驶行动', x: 450, y: 340 },
    ],
    requiredEdges: [
      edge('front-camera', 'processor', 'image'),
      edge('surround-camera', 'processor', 'image'),
      edge('lidar', 'processor', 'laser-distance'),
      edge('millimeter-teaching', 'processor', 'radio-target'),
      edge('ultrasonic', 'processor', 'near-distance'),
      edge('processor', 'driver-action', 'analysis'),
    ],
  },
];
const taskSockets: Readonly<Record<string, readonly string[]>> = {
  'explore-energy-battery': ['socket-power-battery'],
  'explore-energy-motor': ['socket-power-motor'],
  'explore-energy-transmission': ['socket-power-transmission'],
  'explore-energy-wheel': ['socket-power-wheel'],
  'explore-structure-body': ['socket-support-body'],
  'explore-structure-suspension': ['socket-support-suspension'],
  'explore-structure-chassis': ['socket-support-suspension', 'socket-support-brakes'],
  'explore-structure-wheel': ['socket-support-wheel'],
  'explore-sensor-front-camera': ['socket-sensor-front'],
  'explore-sensor-surround-camera': ['socket-sensor-surround'],
  'explore-sensor-lidar': ['socket-sensor-lidar'],
  'explore-sensor-millimeter': ['socket-sensor-millimeter-teaching'],
  'explore-sensor-ultrasonic': ['socket-sensor-near'],
};
const installation = getStructureSource().tasks.map((task) => {
  const sockets = taskSockets[task.id].map(
    (id) => structureBoards.flatMap((b) => b.sockets).find((s) => s.id === id)!,
  );
  return {
    id: task.id,
    sourceTaskId: task.id,
    boardId: structureBoards.find((b) => b.sockets.includes(sockets[0]))!.id,
    requiredSocketParts: Object.fromEntries(sockets.map((s) => [s.id, s.partId])),
    weight: 40,
    teachingOnly: task.id === 'explore-sensor-millimeter',
  } satisfies DiagramObjective;
});
export const structureContent: StructureLabContent = {
  parts: diagramParts,
  boards: structureBoards,
  objectives: [
    ...installation,
    ...structureBoards.map((b) => ({
      id: `structure-link-${b.id}`,
      boardId: b.id,
      requiredSocketParts: {},
      weight: 160,
    })),
  ],
};

/** Categories only: this does not reveal which source connects to which target. */
export function getBoardRelationIds(board: DiagramBoard): readonly string[] {
  const plausibleDistractor: Record<StructureLabBoard, string> = {
    power: 'slow-rotation',
    support: 'rotation',
    perception: 'electric-energy',
  };
  return [...new Set([...board.requiredEdges.map((edge) => edge.relationId), plausibleDistractor[board.id]])];
}
