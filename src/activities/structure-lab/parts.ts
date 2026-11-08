export interface DiagramPart {
  readonly id: string;
  readonly label: string;
  readonly functionLabel: string;
  readonly sourceTargetKeys: readonly string[];
  readonly teachingOnly: boolean;
}
const part = (
  id: string,
  label: string,
  functionLabel: string,
  keys: readonly string[],
  teachingOnly = false,
): DiagramPart => ({ id: `part-${id}`, label, functionLabel, sourceTargetKeys: keys, teachingOnly });
export const diagramParts: readonly DiagramPart[] = [
  part('battery', '动力电池', '储存电能', ['explore-energy-battery']),
  part('motor', '驱动电机', '把电能变成转动', ['explore-energy-motor']),
  part('transmission', '传动机构', '传递和调整转动', ['explore-energy-transmission']),
  part('wheel', '轮胎', '与路面接触', ['explore-energy-wheel', 'explore-structure-wheel']),
  part('body', '车身骨架', '承载与连接', ['explore-structure-body']),
  part('suspension', '悬架', '支撑并缓和起伏', ['explore-structure-suspension', 'explore-structure-chassis']),
  part('brakes', '制动系统', '让车轮减慢转动', ['explore-structure-chassis']),
  part('camera-front', '前向摄像头', '收集前方图像', ['explore-sensor-front-camera']),
  part('camera-surround', '周向摄像头', '收集侧后方图像', ['explore-sensor-surround-camera']),
  part('lidar', '激光雷达', '用激光回波测距', ['explore-sensor-lidar']),
  part(
    'millimeter-teaching',
    '毫米波雷达 · 教学示意',
    '用无线电波探测目标',
    ['explore-sensor-millimeter'],
    true,
  ),
  part('ultrasonic', '超声波传感器', '用声波观察近物', ['explore-sensor-ultrasonic']),
];
