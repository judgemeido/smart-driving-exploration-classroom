# 智驾博物馆三维探索课堂 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 本轮仅写计划，不执行产品代码、安装或删除；用户审阅后才实施。若具名包装技能不存在，按既定多agent分工、接口所有权和独立review执行，不伪称已调用。

**Goal:** 把三个脱离课堂的二维活动重构为原博物馆风格下的三维探索学习，用十个短活动、两次诊断竞答与一次改进实验服务“老师讲解后，每人独立验证”。

**Architecture:** 先在临时`classroom/index.html`验证一套学习运行时，再提升到原`index.html`主入口与四章节导航。模型/信息/判定/记录共用领域快照，teardown用于机制分层、剖视、联动与质量适配；不嵌其独立运行器。当前原展厅观察控制器只在资料观察模式单独挂载，实验用新controller，切换先释放旧视图。

**Tech Stack:** 现有TypeScript、Vite、Three0.180、DOM/CSS、Vitest、Playwright；本地模型与资料。无第二渲染引擎、新UI框架、后端、联网控班、视频生成或实体制造。

**Spec:** [三维探索课堂设计稿](../specs/2026-11-09-teardown-learning-redesign-design.md)。执行者先读全文；十活动内容、科学边界、课堂节奏和视觉依据在设计稿，本计划定义交付顺序与接口。

## Global Constraints

- 每人一台电脑，老师先讲一段再让学生操作；总课时/人数未定，不能沿用未提交草案的150分钟/36人。
- 无实体部件、无正式360秒局/1000分/首局锁/离页作废。平时活动不限时，预测错误不扣探索完成；活动可自由进入。
- 课堂知识竞答建议两次各3题、每题1分；首答/修正分开，无速度榜或伪班级统计。
- 原炭黑/深绿/米白/琥珀/青绿视觉身份；正文/按钮≥18px、辅助≥16px、目标≥44×44 CSS px，重要操作≥48px；不复制原小字与过长面板。
- 同一状态驱动机制、读数、判定与记录；相机/视觉动画不改科学结果。3D坐标有单位，物理真值与设备观测分开。
- 只有显式演示/运行；无25秒自动导览，无后台补跑。相机拖动、列表和键盘可等效，200%缩放可重排。
- 先保留现有生产入口，完整样例/试讲通过后再迁移；两份未提交2D课堂草案不改不提交。源码删除前追踪消费者。
- 新学习记录独立namespace，旧正式记录只读兼容，不转成学习完成或清除。
- 此计划所有检查均待执行，不把246/95基线当作新版结果；不能仅凭自动测试宣布学习效果成立。

## Review Focus

- 全知场景与设备可见信息不同：遮挡/雾天不能泄漏真值给决策（任务3、5、6）。
- 运行中换变量/换区/后台/动画取消：记录绑定开始时配置，恢复不重复提交或补跑（任务1、2、7）。
- 始终停车、缺策略、未知输入：安全处理和任务完成分别评价，不产生默认撞人/自动通行（任务3、6、7）。
- 比较/复测/重播/刷新：首次预测与前两轮快照保留，不能用已修改配置解释旧结果（任务1、7）。
- 弱GPU、模型缺失、WebGL丢失：同任务可用2D继续，监听/renderer不叠加，键盘操作不消失（任务2、8）。

## 交付顺序与审核门槛

| 批次 | 可审阅成果 | 扩展前必须证实 |
| --- | --- | --- |
| A | E2完整样例：3D学校道路/功能车、预测、运行断点、证据、改一处复测；S2一个米制求交片段 | 风格贴近原馆；孩子知道改了什么，能看到并解释结果；3D真值/读数同源 |
| B | H1/H2/E1/S1/S2/S3/T1/T2/T3及Q1/Q2，复用A模型 | 各活动机制不同，至少一个有意义的对照/史料推理；不批量复制连线表单 |
| C | 综合实验、记录/导出、主入口提升、旧链接兼容、低配与课堂验证 | 原资料可用、记录可恢复、无网资源完备、目标机可操作 |

默认保留之前用户指定的多agent方式：正常模块6.1 Sol；Luna仅做资料ID索引、来源清单、链接校验等轻活。A中共同合同和3D底座先由单owner完成，再并行扩展领域；一名集成人独占build、浏览器端口、主入口和Git。Luna不可用时重分配，不把派发算完成。

## 文件地图

```text
classroom/index.html                       临时预览入口，最终退场
src/learning/
  main.ts / bootstrap.ts / routes.ts       入口、单视图所有权、兼容hash
  types.ts / catalog.ts / sources.ts       共同合同、十活动/竞答目录、来源映射
  shell.ts / styles.css / tokens.css       原馆身份的课堂壳和三阶段布局
  session.ts / storage.ts / records.ts     草稿、不可变观察快照、保存与导入
  observation.ts                          原展厅自由观察的隔离挂载适配
  simulation/types.ts / engine.ts         信息、策略、执行统一模型
  simulation/scenarios.ts / evidence.ts   确定事件与定性证据样例
  three/stage.ts / quality.ts / warm.ts    单renderer、循环、预热与低档
  three/vehicle.ts / drivetrain.ts        现车节点适配、功能电驱模型
  three/world.ts / geometry.ts            米制世界、解析射线/遮挡
  three/sensor.ts / road.ts               感知台和道路视觉投影
  activities/history/{content,state,controller,view}.ts
  activities/structure/{content,state,controller,view}.ts
  activities/sensor/{content,state,controller,view}.ts
  activities/traffic/{content,state,controller,view}.ts
  knowledge/{content,state,view}.ts
  workbench/{state,controller,view}.ts
  report/{model,view,print.css,legacy-records.ts}
public/assets/learning/                    已获准的功能模型/LOD/本地参考
docs/development/teardown-learning-sources.md
docs/teaching/teardown-learning-guide.md
docs/engineering/teardown-learning-verification.md
```

来源复用`chapters/*/data.ts`、各章`learning-data.ts`、LiDAR`measurement.ts`，以及纯生命周期/资源工具；新领域不导入原controller/旧arcade session。自由观察适配单独允许动态挂载原controller，绝不共享活动画布。

## 共同接口：先锁定邻接边界

以下定义在`src/learning/types.ts`；领域内部action和视觉小组件由owner决定，不另造公共评分模型。

```ts
type ActivityId = 'H1'|'H2'|'E1'|'E2'|'S1'|'S2'|'S3'|'T1'|'T2'|'T3';
type SectionId = 'history'|'explore'|'lidar'|'traffic';
type LearningRoute =
  | {kind:'section'; section:SectionId}
  | {kind:'activity'; activityId:ActivityId}
  | {kind:'observation'; section:SectionId}
  | {kind:'knowledge'; quizId:'Q1'|'Q2'}
  | {kind:'workbench'} | {kind:'report'} | {kind:'legacy-records'};
type LessonPhase = 'demonstration'|'prediction'|'experiment'|'reflection';
type SensorId = 'camera'|'radar'|'lidar';
type Condition = 'pedestrian'|'red-light'|'uncertain'|'clear';
type Action = 'wait'|'safe-stop-alert'|'cautious-go';
interface SignalLink { from: 'sensor'|'compute'; to: 'compute'|'actuator' }
interface TrialConfig {
  sensors: readonly SensorId[];
  links: readonly SignalLink[];
  rules: readonly {id:string; condition:Condition; action:Action}[];
}
interface Observation {
  // 字段可缺失；没有数据不等于clear。raw字段与semantic判断不能混写。
  source: SensorId; field: 'distance'|'relative-motion'|'shape'|'image'|'signal-color'|'object-class';
  status: 'available'|'weakened'|'unknown'; value: string|number|null; reason:string;
}
interface TrialFrame {
  stepId:string; observations:readonly Observation[];
  condition:Condition; ruleId:string|null;
  commanded:Action|null; executed:Action|null;
  reason:string;
}
interface TrialResult {
  frames:readonly TrialFrame[]; safetyVerified:boolean; taskCompleted:boolean;
  reasons:readonly string[];
}
interface EvidenceRun<C=unknown,E=unknown> {
  id:string; activityId:ActivityId|'workbench'; modelVersion:string;
  scenarioId:string; seed:string; config:Readonly<C>; evidence:Readonly<E>;
}
interface ActivityRecord {
  activityId:ActivityId; phase:LessonPhase; draft:unknown;
  prediction:string; runs:readonly EvidenceRun[];
  explanation:string; transferAttempt:string; completed:boolean;
}
interface LearningLesson extends ChapterController {
  // 运行态与说明由领域控制器管理；snapshot用于持久化而非序列化Three对象。
  getRecord():ActivityRecord;
}
```

共同函数：`parseLearningRoute(hash:string):LearningRoute`与`formatLearningRoute(route:LearningRoute):string`定义于routes.ts；空hash→history目录，章节/活动映射只有catalog定义。`#explore/observe`等为自由观察，`#report/legacy`为旧成绩只读查看，其余按设计稿7节。未知子路由回本章目录，未知根回history。`createLearningRepository(storage?:Storage):LearningRepository`提供`load/save/export/importPreview/applyImport`，导入先校验不默认合并。`createLearningLesson(host, context):LearningLesson`是每个领域目录的controller导出，context包含当前活动、档案初值、onRecord和AbortSignal，调用者只能保存可序列化领域数据。各领域在content.ts提供`validateDraft(value:unknown):Draft|null`和`modelVersion`；storage不盲目信任unknown。领域版本不兼容时保留旧记录只读，拒绝把旧draft注入新控制器。

共同规则：`evaluateTrial(config:TrialConfig, scenario:TeachingScenario):TrialResult`；`TeachingScenario`在simulation/types.ts显式定义初态/事件序列/目标/证据样例ID，不读DOM或Three。`TeachingWorld`与`castTeachingRay(world, originMeters, direction):RayHit|null`在three/geometry.ts定义；RayHit包含targetId、pointMeters、distanceMeters、occludedBy，遵循最近正交点。往返时间用现有measurement纯函数。

## 任务1：学习壳、记录合同与课堂阶段

**Files:** 新增learning的types/catalog/sources/routes/shell/styles/tokens/session/storage/records/bootstrap/main、临时classroom HTML；修改vite.config.ts新增暂时入口；单元`tests/unit/learning/{routes,records,storage}.test.ts`，浏览器`tests/e2e/learning-shell.spec.ts`。

**Interfaces:** 生产上述共同types/repository/LearningLesson挂载context；bootstrap只拥有一个当前view，通过navigate先dispose再mount。交给任务2–7使用，主入口尚不切换。

- [ ] 写失败规则测试：`#lidar/S2`解析正确；未知活动回本章目录；重复hash不重复mount；历史bare hash可识别；存档恢复阶段与预测；corrupt/future schema不覆写，quota报未保存且可导出；运行快照深复制后改draft不改旧run。
- [ ] 运行`npm run test:unit -- tests/unit/learning/routes.test.ts tests/unit/learning/records.test.ts tests/unit/learning/storage.test.ts`，记录真实RED。
- [ ] 实现原馆课堂壳和repository，namespace用`science-learning:portfolio:v1`。讲解/预测/操作/记录可显式切换；“开始验证”不需要昵称/挑战码；未知文本按文本输出，IME中不确认，建议解释0–120 Unicode字符可省。
- [ ] 写浏览器断言1366×768/1280×720当前对象/变量/主操作可见，抽屉返回焦点；关闭讲解后当前实验不重置；切换不留隐藏交互控件；200%重排不整体缩小。先build再运行`npm run test:e2e -- tests/e2e/learning-shell.spec.ts`，unit与browser通过后保存该包。

## 任务2：三维机制底座与共用模型

**Files:** learning/three/{stage,quality,warm,vehicle,drivetrain,world,geometry,sensor,road}.ts，sources资产清单、功能LOD；测试`tests/unit/learning/{geometry,drivetrain,assets}.test.ts`、`tests/e2e/learning-three.spec.ts`。

**Interfaces:** 生产`createLearningStage<T>(host, createPresenter, createFallback):LearningStage<T>`，包含`setSnapshot(snapshot:T)`、`setActive(boolean)`、`dispose()`；presenter只读快照，`render(snapshot:T, playbackSeconds:number)`不得提交领域动作。stage给scene/camera/controls/quality/scope，独占循环。生产`createVehiclePresenter/createSensorPresenter/createRoadPresenter`，各帧类型在本任务模块导出；后续活动将领域状态映射成这些帧。geometry生产TeachingWorld/RayHit，供任务5测量。

- [ ] 先写无DOM规则测试：16m→约106.7ns；60m→约400.3ns；最近表面/遮挡/擦边/未命中/原点在体内的约定一致；镜头/显示缩放不变距离；电驱供能断开与传动断开产生不同输入/输出；没有NaN。断供能是无惯性台架约定，测试不冒充整车制动。
- [ ] 运行对应unit记录RED。审查已有GLB节点及DAE许可，固定teardown来源commit，建立功能几何参考与参数表；未知尺寸不显示真实产品精度。
- [ ] 实现三个可复用模型、warm和低档。解析碰撞几何与可视mesh从同world生成；先运行样例再量draw calls，目标精简同屏<150k三角形/<180 draw calls，若达不到则换功能LOD而非只降DPR。复制实质代码才附完整MIT通知；记录哪些是方法借鉴。
- [ ] 浏览器检查整机/分层/剖切/动作中间态、相机近远和标签；验证一个当前canvas/renderer、无第二RAF、迟到加载被取消后释放、隐藏无绘制、恢复delta不跳、context lost转同源2D保留状态。运行unit/build与`learning-three.spec.ts`通过，资产画面经人工看图后保存。

## 任务3：E2完整因果样例与公共仿真引擎（A验收）

**Files:** simulation/{types,engine,scenarios,evidence}.ts，activities/structure/{content,state,controller,view}.ts中E2，临时课堂catalog接线；`tests/unit/learning/{simulation,structure}.test.ts`、`tests/e2e/learning-e2-pilot.spec.ts`。

**Interfaces:** 消费任务1context、任务2车辆/道路presenter；生产evaluateTrial、TeachingScenario、公开3类基础断点样例，供任务5/6/7。规则匹配互斥，重复condition冲突要显示并阻止运行。观测先经evidence再给condition，engine不能读世界全知标签。

`TeachingScenario`事件包含stepId、观测样例引用、clear所需字段、是否有信号和任务类型`pass-through|stop-and-alert`，初态及样例ID固定在scenarios/evidence中并带modelVersion。判定优先级`pedestrian > red-light > uncertain > clear`，仅available字段可满足必要条件；缺失/弱化不等于clear。A事件为行人→确认清空、B为红灯→绿灯且清空、C持续未知/有安全停靠条件，分别消费设计稿5节约定，不由视觉时间临时推导。

- [ ] 写失败测试：有效输入/策略/执行连通时动作匹配；缺sensor→uncertain，缺rule→commanded=null，断执行→executed=null；行人/红灯/未知下无安全策略时safetyVerified=false；已确认clear下不前进可安全但taskCompleted=false；运行中改draft不污染旧result。
- [ ] 运行对应unit记录RED；实现教师讲解、学生预测、端口点击/键盘连接、显式逐步运行、断点定位与只改一处复测。观察帧同时驱动3D信息流、部件和日志，不用先写固定动画再判答案。
- [ ] 写完整浏览器路线：预测→运行失败→打开工作层看证据→修执行连接→同初态复测→解释→换缺输入样例；验证两run配置差异正好一个字段，正确部分仍在，可重新修改而非完成锁。
- [ ] 运行unit/build/`learning-e2-pilot.spec.ts`；独立看1366/1280和错误/修复/对照六态。安排设计稿9节建议儿童样例试讲；未能组织时明确标“教学门槛未验证”，先交可玩A样例供审，不宣称全部课程完成，不自动批量扩展十项。

## 任务4：H1/H2与E1：史料、能量和部件观察

**Files:** activities/history四文件、structure四文件中E1；sources映射、资产资料；`tests/unit/learning/{history,structure}.test.ts`、`tests/e2e/learning-history-structure.spec.ts`。

**Interfaces:** 消费task1 record、task2 drivetrain/vehicle帧、task3引擎的功能输入输出；生产H1/H2/E1三lesson。事实保持sourceExhibitId可追溯；E1选中/打开与H2驱动输入分开，打开外壳不等于断功能连接。

- [ ] 先测史料三/五事件次序与source ID有效，初排保留；同一需求允许多技术事实，未来自由文本不走唯一答案；断传动“电机运行/车轮无驱动”与断供能结果不同；单纯旋转/点过所有热点不能自动完成。
- [ ] RED后实现档案引用/局部纠错、可逆电驱对照、三维部件隔离/剖切/列表，扩展资料收进选做。三能源路线仅有来源的功能层，不加无依据效率或官方内部造型。
- [ ] 浏览器分别完成一条史料推理、一条能量前后观察、一条部件功能解释；鼠标/键盘、重置/换区/刷新恢复、IME/HTML文本与取消验证。运行对应unit/build/E2E通过，另由资料owner核对来源后保存。

## 任务5：S1/S2/S3：信息、回波与环境对照

**Files:** activities/sensor四文件、simulation/evidence.ts样例、three/sensor/world/geometry适配；`tests/unit/learning/{sensor,evidence,geometry}.test.ts`、`tests/e2e/learning-sensor.spec.ts`。

**Interfaces:** castTeachingRay与共同世界生成距离/点云；同源hit作为S2快照；S1/S3使用Observation[]，区分world真值、原始测量与处理解释。Q2和综合实验复用同一evidence样例ID，不单写一套天气规则。

- [ ] 先测灯色改变不改距离，目标移动改变t=2d/c；纯radar/lidar不产生signal-color；未命中不沿用前距离；遮挡先命中近表面；轻雨样例仍可有available字段，浓雾样例unknown不代表空路。
- [ ] RED后实现同场景三视图、先预测再揭示、沿标定轴移动目标、发射/接收剖视、晴/轻雨/浓雾对照与独立遮挡对照。没有测量依据的噪点只做装饰，不进入证据。
- [ ] 浏览器走两距离两时间、换视角不改读数、一次未命中、两天气同条件记录；全键盘调整并看到目标与确认，reduced-motion逐步仍有同样结果。运行unit/build/E2E通过；科学审阅字段含义、单位及天气说明后保存。

## 任务6：T1/T2/T3与两段课堂知识竞答

**Files:** activities/traffic四文件，knowledge/{content,state,view}.ts；必要road presenter补充；`tests/unit/learning/{traffic,knowledge}.test.ts`、`tests/e2e/learning-traffic-knowledge.spec.ts`。

**Interfaces:** 消费task3 engine与task5 evidence，产生道路三个lesson及QuizRecord（draft/immutableFirstSubmission/corrections/reviewOpen在knowledge/state定义），record层按Q1/Q2独立保存，无跨设备状态。

- [ ] 先测观察位置改变只影响可见字段；红灯/有人/未知/clear四状态下动作与任务分别评价；绿灯不覆盖行人条件；缺策略不默认前进；首答提交一次冻结，复习修正不覆盖；刷新恢复未交草稿。
- [ ] RED后实现三维盲区、决策逐步结果、三层诊断与针对性修复。竞答每轮3题/1分，先交后主动看讲评，清楚标老师口头组织，无联网控班或防提前查看宣称。
- [ ] 浏览器走一次错误判断局部恢复、一次无效修复对照、一次有效修复和两段竞答；不播放撞人/奖励速度，不强制做原八题才能进入综合实验。运行unit/build/E2E通过，课堂负责人审题后保存。

## 任务7：综合改进实验、学习报告与交换文件

**Files:** workbench三文件、report四文件、legacy-records.ts、print.css，records/storage扩展；`tests/unit/learning/{workbench,report,import}.test.ts`、`tests/e2e/learning-workbench-report.spec.ts`。

**Interfaces:** 复用evaluateTrial和A/B/C三个TeachingScenario，EvidenceRun<TrialConfig,TrialResult>作为不可变测试记录。报告只消费记录，不重新按当前config推算过去结果。legacy只读旧repository格式，不能清锁或写旧namespace。

- [ ] 先测A/B一直wait安全但不完成，C未知且任务为停靠时stop+alert可完成；同配置同版本/种子同结果；重播不加run，真实再次测试可如实加相同结果；只改字段可追踪；旧记录不能变新课堂完成。
- [ ] RED后实现推荐配置首测、定位一问题、改一处、三场景同条件复测与一个迁移场景；基础不开放无来源成本/车速/识别率。至少保留两轮，自动生成差异与原因。
- [ ] 实现本机观察报告/打印/JSON，保存失败仍能导出当前内存。导入大小上限1MiB/记录最多500run，校验schema/ID/枚举/有限数值/文本长度，显示预览并显式替换；超限/损坏/未来schema不动当前档案。文件没有真实姓名字段，不假称交老师。
- [ ] 浏览器跑两配置可比、无变化复测、刷新恢复、quota后导出、合法导入替换与拒绝非法文件、打印无控件遮挡。运行对应unit/build/E2E通过后保存。

## 任务8：统一主入口、替换旧活动、目标机验收

**Files:** main.ts、app/chapters.ts或学习bootstrap接线、navigation-items.ts、games三HTML/入口、vite.config.ts、observation.ts；更新README/PROJECT_ARCHITECTURE/维护与教学来源/验收文档；`tests/e2e/learning-migration.spec.ts`与旧基础回归适配。

**Interfaces:** 原根hash与新细分route的format/parse保持一处定义。实验active view全局最多一个owner；观察模式挂原view/controller且先dispose实验，返回继续领域草稿。原资料事实和可观察能力保留，不承诺旧controller同时运行。

- [ ] 先写迁移RED：旧三URL最终到H1/E1/S2，直接刷新/浏览器返回/子路径部署可用；主导航四章仍04，不出现七章；原14展品、模型系统/开合/分层、LiDAR八部件/四步骤/5–80m、道路复习内容可达；无重复六分钟准备页或两组任务入口。
- [ ] 通过A/B/C门槛后才把learning提升主入口，旧三页用尊重BASE_URL的真实兼容跳转和无JS返回链接；临时classroom入口改兼容跳转或从产物移除。旧arcade代码只在无生产消费者时删，保留旧成绩只读所需数据解析，不模糊目录删除。
- [ ] 在1366×768/1280×720/1440×900/1024×768、200%缩放和窄窗批量看讲解/预测/错误/修正/记录/复测；至少一台实际教室集显测试稳定运行60s，标准帧p95≤33ms、低档≤40ms、输入反馈p95≤100ms，记录型号/场景/采样，不用开发机替代。
- [ ] 无外网HTTP服务验收；模型404、WebGL不支持/丢失、低画质、reduced-motion、键盘全流程均能继续学习；多次切换后renderer/loop/监听/GPU不增长。按来源链接清单与复制代码保留许可。
- [ ] 集成人串行`npm run check`，读新总数/退出码；独立教学/科学/设计/工程审核各自给实际缺陷，不为分数凑通过。记录儿童试讲、原图对比和未测项目；未达门槛先修指定问题，不再以“测试全绿”结案。
- [ ] `git diff --check`、本地文档链接和消费者审计通过后，按已授权范围保存本地提交，不自动推送/发布；交付主入口、课时组合建议、教师操作单、资产来源与实测限制。

## 自查与本轮边界

设计稿1–3节由任务1/3覆盖，十活动由任务3–6覆盖，竞答与综合由任务6–7覆盖，视觉/三维与来源由任务2/8覆盖，替换/保存由任务1/7/8覆盖，课堂实效由任务3与8的现场门槛覆盖。Review Focus五项均有所属测试。本轮只保存设计与计划；不安装teardown依赖，不建模型、不改当前网页、不删除旧代码。
