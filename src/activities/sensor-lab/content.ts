export const SENSOR_OBJECTIVES = [
  {id:'pulse-hit',weight:150},{id:'echo-received',weight:100},
  {id:'outline-evidence',weight:150},{id:'nearest-mark',weight:200},
  {id:'sensor-evidence',weight:200},{id:'risk-response',weight:200},
] as const;
export const SENSOR_NAMES = {lidar:'激光雷达',radar:'毫米波雷达',camera:'摄像头'} as const;
