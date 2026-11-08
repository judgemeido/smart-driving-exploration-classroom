# 03 内容修改指南

原展厅保留八部件、四步、装配/拆解/剖视、5–80m测距、扫描暂停与720点、缺DAE时概念降级。新学习在独立 `/games/sensor/index.html`。

| 修改 | 位置（src下） |
| --- | --- |
| 原部件/四步/许可与短文案 | chapters/lidar/data.ts、learning-data.ts、view.ts |
| 原物理换算 | chapters/lidar/measurement.ts，c=299792458m/s |
| 原状态/距离范围/步骤 | experiment-state.ts；每步1.3s，默认20m，5–80m |
| 模型加载/概念/装配/扫描 | model.ts、concept.ts、model-rig.ts、scene.ts、scan-scene.ts、scan-animation.ts |
| 原输入与生命周期 | interaction.ts、controller.ts |
| 独立活动来源/目标/档位 | activities/sensor-lab/source.ts、content.ts、scenario.ts |
| 六目标/扫描证据/测量/天气行动 | activities/sensor-lab/state.ts、measurement.ts、commit.ts |
| 米制投影与命中 | activities/sensor-lab/graphics.ts 的stageGeometry，controller共用 |
| DOM/输入/响应式 | activities/sensor-lab/view.ts、controller.ts、styles.css |

learning-data与learning-measurement仍是新source的纯事实依赖，必须保留。旧learning-state/view/world/camera/weather-state及入口已删除，不要重加旧教学场景逐帧分支。

每目标reflectivePoint是显示/距离/光程/评分唯一米制基准，SVG缩放不参与容差。固定码7K2M4C目标8/16/28m、方位−20/0/20°。16m单程、32m往返、106.7ns；30m200.1ns、60m400.3ns。教学动画放慢不代表真实光速。

扫描−40…40每4°共21槽，跨角消费全部经过槽、重复去重，每目标两槽才确认。引导方向4°/半角6°/尺1m±1；标准方向2°/半角4°/尺0.5m±0.5。方向命中后才解锁接收；空线不计错误、Tx错误、Rx正确。天气要给定情境的LiDAR和毫米波两证据，未知不是不存在；4m观察线/8m路障/停下加提示灯均为游戏参数，不是现实制动距离。

原装配模型保留BSD-3-Clause来源与public/assets/lidar/LICENSE。原重置保留已选距离；示例60m显示400.3ns。setActive停止旧动画、dispose释放所有资源。

检查：`npm run test:unit -- tests/unit/lidar tests/unit/sensor-lab`，构建后跑lidar-domain/lidar-learning/sensor-lab-ui，含普通tap/取消/暂停、米制边界/窄屏/reduced-motion/模型降级。完整`npm run check`。[公共内容地图](../engineering/content-editing-guide.md)。
