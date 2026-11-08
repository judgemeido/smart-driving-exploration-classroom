# 02 内容修改指南

原展厅保留BatteryPack→ADAS→Cabin三步找部件、分类/聚焦/爆炸/开合/灯光/五秒动力故事、复习与四步分组归位。13主题与功能图位于独立 `/games/structure/index.html`。

| 修改 | 位置（src下） |
| --- | --- |
| 三任务/部件/分类/动力阶段文案 | chapters/explore/data.ts |
| 原三任务、五秒故事 | mission-state.ts、powerflow-state.ts |
| 模型节点/展开/开合/灯光、动力路径 | vehicle-rig.ts、powerflow-scene.ts、scene.ts |
| 复习内容/节点来源 | learning-data.ts、learning-targets.ts |
| 复习与四步归位 | learning-view.ts仅保留renderExploreReview/renderExploreAssembly，assembly-state.ts、camera-observation.ts |
| 独立活动事实/部件/图 | activities/structure-lab/source.ts、parts.ts、content.ts |
| 装配、湿路、语义图、提示、锁定 | activities/structure-lab/state.ts、transaction.ts |
| 端口坐标/箭头、输入与布局 | activities/structure-lab/graphics.ts、controller.ts、view.ts、styles.css |

原模型target必须匹配GLB的EV_SUV下顶层装配名。删除新旧教学功能时勿误删review/assembly共用渲染、相机观察快照或rig的归位方法。

新活动动力/支撑/感知为4/4/5主题；安装目标各40、三图各160。底盘要分别装悬架与制动；轮胎还要切湿滑观察；毫米波雷达在部件/槽/记录均标教学示意。三张有向语义图的requiredEdges是规则真值，几何节点位置只负责画箭头。图少于4/4/6条时不判；达到数量后要求精确边集合。错边可局部删除，已验证目标锁定。

连线用起点→终点→关系标签→连接，也可拖动先定端点；键盘与轻触等效，Escape取消未提交操作。拖动不写评分。每候选操作须通过session.record，再改state。

旧13挑战learning-state与renderExploreLearning已移除。修改源码后跑 `npm run test:unit -- tests/unit/explore tests/unit/structure-lab`；集成构建后跑explore-domain/explore-learning/structure-lab E2E，含相机、复习、归位和资源重试。完整`npm run check`。[公共内容地图](../engineering/content-editing-guide.md)。
