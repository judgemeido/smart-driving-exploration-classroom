# 内容与小游戏修改地图

四个原展厅加三个独立二维活动。维护者修改源码；产品中不提供内容编辑器。

| 内容 | 事实与配置 | 规则 | 表现 |
| --- | --- | --- | --- |
| 01原展品 | `chapters/history/data.ts`、`learning-data.ts`事实引用 | 原年份定位controller | render/view、gallery/viewport CSS |
| 01进化修复站 | `activities/history-lab/source.ts`、`content.ts` | state、transaction、control-state | controller/view/graphics/styles |
| 02原展厅 | `chapters/explore/data.ts`、learning-data/targets | mission-state、powerflow-state、assembly-state | rig/scene、review/assembly渲染、camera-observation |
| 02系统维修台 | `activities/structure-lab/source.ts`、content/parts | state、transaction | controller/view/graphics/styles |
| 03原展品 | `chapters/lidar/data.ts`、learning-data | measurement、experiment-state | rig/model/scene、scan动画与interaction |
| 03回波侦探 | `activities/sensor-lab/source.ts`、content/scenario | state、measurement、commit | controller/view/graphics/stageGeometry/styles |
| 04道路 | `chapters/traffic/data.ts`、learning-data | rules、practice-state | simulation/scenario-scene、practice-scene/view |

上述路径均以src为根。详细指南：[01](../development/history-content.md)、[02](../development/explore-content.md)、[03](../development/lidar-content.md)、[04](../development/traffic-content.md)。

三活动source只读适配原纯事实；不要重新导入已迁出的旧学习controller/state/view。更改稳定ID需同步目标、来源和验收；中文label不是ID。题目事实与几何位置分开，SVG不能成为另一套判分数据。

01五事件插入重排；三需求中电池/混动/氢能三分支共享能源目标。未来四价值没有排名，理由可省略，0–120 Unicode字符；不评观点质量，IME结束前不提交，不写本机记录。

02动力/支撑/感知为4/4/5主题，13安装各40与3图各160。支撑分别要求悬架与制动，轮胎还要湿路观察；毫米波雷达标教学示意。图少于4/4/6条不判错，达到数量按有向语义requiredEdges精确集合验证。局部删边不丢正确关系；已验证目标本局锁定。

03统一reflectivePoint求距离、光程、时间和评分。c=299792458m/s，16m的往返为32m/106.7ns。扫描-40…40每4°去重，每目标至少两槽。引导方向4°/半角6°/尺1m±1；标准方向2°/半角4°/尺0.5m±0.5。stageGeometry只投影与命中，不改米制容差。天气证据只描述给定教学情境，未知不等于不存在；4m观察线不是现实制动距离。

公共规则和本机记录：`shared/arcade`。统一UI/教程/反馈/结果：`ui/arcade`。修改评分/档位/时长时同步内容或评分版本和[计分附录](2026-11-08-science-arcade-scoring.md)。练习与正式记录不可混排比较；不要用昵称改动释放正式锁。

先运行目标unit，再由集成负责人串行运行build与相关E2E。完整`npm run check`。验收必须实际看桌面/手机、错误修正、取消和最终成果；截图不能代替触屏手势。实施证据见[验收记录](science-activities-ui-verification.md)。
