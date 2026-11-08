import type { ActivityDefinition, SectionId } from './types';
export const sections: { id: SectionId; number: string; title: string; short: string }[] = [
  { id: 'history', number: '01', title: '汽车如何进化', short: '发展与能量' },
  { id: 'explore', number: '02', title: '打开汽车看系统', short: '结构与协作' },
  { id: 'lidar', number: '03', title: '让汽车感知世界', short: '观察与测量' },
];
export const activities: ActivityDefinition[] = [
  {
    id: 'H1',
    section: 'history',
    title: '汽车进化档案',
    question: '汽车的变化，解决了什么问题？',
    instruction: '读一条史料，调整时间顺序，再用证据解释一次变化。',
    teacher: '技术不是突然出现的。研究、示范和走入日常生活，分别需要不同证据。先听老师讲解，再打开档案核对。',
    predictionPrompt: '哪一项变化应该先发生？为什么？',
    transfer: '如果要让一项新技术进入校园，你会先验证什么？',
  },
  {
    id: 'H2',
    section: 'history',
    title: '能量怎样到达车轮',
    question: '电机在转，车轮就一定会转吗？',
    instruction: '保持其他条件不变，只断开供能或传动，比较两次结果。',
    teacher:
      '电池提供能量，电机把电能转成机械运动，传动机构将运动传给车轮。这里是没有惯性的功能台架，不是整车制动仿真。',
    predictionPrompt: '断开传动后，电机和车轮会怎样？',
    transfer: '如果车轮不动，你会先检查哪两处？',
  },
  {
    id: 'E1',
    section: 'explore',
    title: '打开工作中的部件',
    question: '看不到的部件，各自在做什么？',
    instruction: '选择部件，展开工作层，用模型和说明寻找它的作用。',
    teacher: '拆开外壳是为了观察；它不等于切断供电或信号。通过部件列表和分层按钮，找到能量与信息经过的位置。',
    predictionPrompt: '负责获取信息和负责让车停下的，是同一个部件吗？',
    transfer: '选两个部件，解释它们怎样合作。',
  },
  {
    id: 'E2',
    section: 'explore',
    title: '让信息跑起来',
    question: '车看到了行人，为什么还没有停下？',
    instruction: '先运行故障样例，沿证据定位断点，只修一处，再用相同情境复测。',
    teacher:
      '传感器提供观测，计算系统产生指令，执行机构完成动作。知道危险、发出指令、实际停车是三件不同的事。',
    predictionPrompt: '你认为断点在输入、判断还是执行？',
    transfer: '换成输入缺失时，车辆可以把“没看到”当成“没有人”吗？',
  },
  {
    id: 'S1',
    section: 'lidar',
    title: '三种设备，三种线索',
    question: '测到距离，就知道红绿灯颜色吗？',
    instruction: '切换设备，比较同一场景中可得到与得不到的信息。',
    teacher:
      '摄像头记录图像，毫米波雷达测量距离和相对运动，激光雷达获得距离与空间轮廓。原始信号还需要处理，设备不能各自包办全部判断。',
    predictionPrompt: '哪个设备能提供信号灯颜色的图像线索？',
    transfer: '如果图像被遮住，只剩距离信息，能直接决定通行吗？',
  },
  {
    id: 'S2',
    section: 'lidar',
    title: '先猜，再测一次回波',
    question: '目标远一倍，回波时间会怎样？',
    instruction: '移动目标、调整方向，发射一次，再比较距离与往返时间。',
    teacher:
      '光走到目标再返回，路程是单程距离的两倍。距离 = 光速 × 往返时间 ÷ 2。画面是按米构建的示意场景，相机变化不会改变测量。',
    predictionPrompt: '16米和32米目标，哪一次回波更晚？大约晚多少？',
    transfer: '加入近处遮挡后，第一束回波来自哪里？',
  },
  {
    id: 'S3',
    section: 'lidar',
    title: '天气与遮挡对照',
    question: '没有可靠回波，能说明前方没有东西吗？',
    instruction: '固定目标距离，每次只改变天气或遮挡，记录信息怎样变化。',
    teacher:
      '天气影响与设备、目标和条件有关。这里使用可重复的定性教学样例；轻雨不意味着所有设备失效，信息不足也不等于道路清空。',
    predictionPrompt: '浓雾下信息不足时，你还需要什么证据？',
    transfer: '设计一个只改变一个条件的对照实验。',
  },
];
