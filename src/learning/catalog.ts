import type { ActivityDefinition, SectionId } from './types';
export const sections: { id: SectionId; number: string; title: string; short: string }[] = [
  { id: 'battery', number: '00', title: '电池怎样发展', short: '储能与选择' },
  { id: 'history', number: '01', title: '汽车如何进化', short: '发展与能量' },
  { id: 'explore', number: '02', title: '打开汽车看系统', short: '结构与协作' },
  { id: 'lidar', number: '03', title: '让汽车感知世界', short: '观察与测量' },
];
export const activities: ActivityDefinition[] = [
  {
    id: 'B1',
    section: 'battery',
    title: '从一块电池开始',
    question: '电池越来越多，为什么没有一种适合所有用途？',
    instruction: '切换电池与充放电方向，再打开结构。',
    teacher: '从铅酸到镍氢与锂离子，材料和用途逐渐丰富。今天磷酸铁锂与三元锂仍在并行使用，重量、成本、寿命和温度管理都需要权衡。先听老师讲解，再比较结构和能量流向。',
    predictionPrompt: '新电池出现后，早期的电池就都没有用途了吗？',
    transfer: '你的电池和充放电观察，支持哪种发现？',
  },
  {
    id: 'H1',
    section: 'history',
    title: '四辆车，四种出行需要',
    question: '汽车的变化，解决了什么问题？',
    instruction: '选两辆车，打开车身或演示动力。',
    teacher: '燃油车和电动车在早期就已经出现。不同年代的车辆回应不同需要，混合动力与纯电动也会并行发展。这些模型展示时代特征，不是具体车型的原厂结构。',
    predictionPrompt: '早期电动车和燃油车，是否曾经同时存在？',
    transfer: '哪条发现得到这些史料的支持？',
  },
  {
    id: 'H2',
    section: 'history',
    title: '能量怎样到达车轮',
    question: '电机在转，车轮就一定会转吗？',
    instruction: '保持其他条件不变，只断开供能或传动，比较两次结果。',
    teacher:
      '先认出整车，再观察能源如何到达车轮。电池提供能量，电机转成机械运动，传动把运动传给车轮。断路操作采用忽略惯性的教学模型，不能用于推断真实行驶中的停车距离。',
    predictionPrompt: '断开传动后，电机和车轮会怎样？',
    transfer: '你记录的电机与车轮状态，支持哪条发现？',
  },
  {
    id: 'E1',
    section: 'explore',
    title: '打开工作中的部件',
    question: '看不到的部件，各自在做什么？',
    instruction: '选择部件，展开工作层，用模型和说明寻找它的作用。',
    teacher: '拆开外壳是为了观察；它不等于切断供电或信号。通过部件列表和分层按钮，找到能量与信息经过的位置。',
    predictionPrompt: '负责获取信息和负责让车停下的，是同一个部件吗？',
    transfer: '哪条发现描述了你观察到的部件协作？',
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
    transfer: '这次两帧证据，支持哪条发现？',
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
    transfer: '你选择的设备，能提供哪些线索？',
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
    transfer: '这次的距离、时间或空读数，支持哪条发现？',
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
    transfer: '你的天气或遮挡对照，支持哪条发现？',
  },
];
