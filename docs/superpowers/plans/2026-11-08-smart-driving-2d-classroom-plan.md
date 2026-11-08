# 智能驾驶科普公开课 2D 改版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 本文件为待审阅的计划；本轮不实施产品代码，执行方式另定。

**Goal:** 为 36 名三至六年级新手构建 150 分钟的 2D 科普课堂，以十个短互动、两次知识竞答和一次方案改进实验完成学习。

**Architecture:** 新增 `classroom/index.html`，保持与现有四展厅分离的课堂运行入口。课堂内使用 hash 切换学习区，纯内容和规则复用、平面呈现重做；道路诊断和综合实验共享确定性的事件引擎。本地学习档案串起草稿、观察和前后测试。

**Tech Stack:** 现有 TypeScript、Vite、HTML/CSS、SVG；Vitest、Playwright。不新增 UI 框架、游戏引擎、后端、在线 AI 或 3D 依赖。

**Spec:** [改版设计稿 V1](../specs/2026-11-08-smart-driving-2d-classroom-design.md)。课程范围、活动条件和推荐参数以该稿为准，均尚未经过儿童试用。

## Global Constraints

- 150 分钟，36 名三至六年级学生，新手，每人一台电脑。
- 全程数字活动，没有可用的实体部件；删除实体制造、实体装配环节。
- 使用 2D 平面 UI 即可完成。
- 默认活动不限时；教师管理课堂节奏，不给每个学生设置倒计时。
- 每次 3 题、每题 1 分；所有学生先独立提交，再统一讲解，不奖励作答速度，不建立跨年级排行榜。
- 正文/按钮至少 18px、辅助字至少 16px、交互目标至少 44×44 CSS px。
- 无金币、生命值、商城、淘汰或强制门禁；无跨设备自动同步或虚构班级数据。
- 不覆盖其他未提交文档；旧展厅原内容及流程保留。不要把其他方案里的正式计时、1000 分制、退出中断规则套到本计划。

## Review Focus

- 换区、刷新和损坏存档不会丢掉仍可恢复的记录，保存失败不显示成功（任务 2、6）。
- 缺少感知信息进入不可靠状态，规则冲突可见且阻止运行（任务 3）。
- 一直停车和安全完成任务可区分；重复运行和重播不制造虚假进步（任务 3、6）。
- 拖动取消、键盘和中文输入法不产生重复确认或焦点丢失（任务 2、4）。
- 子目录部署和课堂直接刷新可用，进入课堂不请求三维模型及外网资源（任务 1、6）。

## 1. 给项目负责人的改版摘要

### 改版目标

让孩子频繁参与有趣操作，同时让界面和成果符合科普课程定位。采用寻找、排序、连接、预测、测量、线索分析、诊断和修复，减少连续阅读与重复选择题。

### 本次保留、调整、新增

| 类别 | 处理 |
| --- | --- |
| 保留 | 现有主站与四展厅；已核对的知识内容、出处、题目 ID 和可独立使用的纯计算 |
| 调整 | 为三四年级补引导路径；课堂必做任务减量；2D 观察与操作；反馈读完再继续 |
| 新增 | 独立课堂首页、信息链连接、道路诊断、综合实验、本地档案与可打印报告 |
| 移出本次课 | 实体组装；强制完成全部 13 项结构任务、全部旧道路题与全部年份档案 |
| 后续选项 | 联网课堂竞答、教师实时统计、更多场景；不阻塞第一版 |

### 150 分钟运行表

| 环节 | 分钟 | 课堂主要成果 |
| --- | ---: | --- |
| 导入、预测、操作示范 | 10 | 学生知道主问题和操作方法 |
| 发展历史：排序与技术匹配 | 15 | 一项需求与技术的联系 |
| 结构探索：找部件与连信息链，含竞答 Q1 | 20 | 信息如何到达执行部件 |
| 感知实验：切换信息、测距、天气对比 | 25 | 一项设备作用及局限 |
| 休息 | 10 | 进度已保存 |
| 道路安全：找线索、判断、诊断，含竞答 Q2 | 25 | 有依据的行动与修复 |
| 综合实验：首测、修改、复测 | 30 | 两轮三个场景的可比记录 |
| 交流、展示、报告保存 | 15 | 每人一份学习报告 |
| **合计** | **150** | 时间分配需试讲验证 |

### 活动设计清单

| ID | 页面名称 | 核心操作 | 完成证据 |
| --- | --- | --- | --- |
| H1 | 汽车进化档案 | 三事件排序、检查、局部更正 | 正确次序与简短解释 |
| H2 | 技术解决了什么问题 | 需求与技术卡配对 | 至少一组关系 |
| E1 | 汽车部件观察 | 在平面车图中找四类功能区域 | 四个部件/区域与作用 |
| E2 | 让信息跑起来 | 连接设备、判断、执行，播放信号流 | 合法信息链 |
| S1 | 汽车看到了什么 | 同场景切换三种信息视图 | 一项信息差异 |
| S2 | 先猜，再测 | 最近目标预测、距离区间、扫描揭示 | 预测及真实教学距离 |
| S3 | 天气变化观察 | 固定设备与目标，对比晴雨雾 | 变化和降低风险行动 |
| T1 | 道路线索观察 | 标出当前场景有关的线索 | 线索选择与遗漏提示 |
| T2 | 我来做判断 | 决策、分步看结果、解释 | 行动与原因 |
| T3 | 系统诊断 | 查信息/规则/执行记录，修复再运行 | 问题、修改与新结果 |

Q1：设备、计算、执行三题；Q2：行人、信号、不可靠信息三题。每题 1 分，前台称课堂知识竞答；第一次独立提交锁定本次答卷，复习纠错另存、不改写首答。提交仅显示收讫，教师口头宣布后学生点击“进入复习”揭示结果；没有远程锁定。每次含讲解共 5 分钟，无自动倒计时、无速度加分。离开或刷新后恢复未提交草稿。

## 2. 2D 页面结构

- `classroom/index.html#home`：主问题、四学习区、综合实验、继续学习、报告和教师说明。
- `#history / #explore / #lidar / #traffic`：对应活动目录，明确必做/选做，随时切换。
- `#workbench`：左侧道路，右侧设备/规则，固定谨慎运行，运行后显示“信息→规则→动作”。设计与测试同页。
- `#report`：观察记录、两次竞答、配置、测试轮次与修改说明；打印、JSON 导出导入。

活动首屏只有一句目标、可操作对象、简短提示和主要按钮。查看说明用折叠区域，不将长文塞进主要操作区。错误保留已完成部分，反馈说明“哪里需要改、为什么、下一步怎么做”。

先覆盖 1366×768、1280×720 桌面与 200% 缩放。手机不作为本期课堂终端；窄窗口仍可滚动、操作不被遮挡。颜色不承担唯一反馈；动画可暂停/跳过/重播，尊重减少动态效果设置。输入法组合中不提交，开放文本按文本输出。

## 3. 分批交付与优先级

| 批次 | 交付物 | 通过门槛 |
| --- | --- | --- |
| A，优先验证 | 课堂壳、E2 信息链、T3 诊断、一个可修改复测的行人样例 | 操作改变状态，修复改变结论；非固定动画伪装测试 |
| B，课堂内容 | 十个活动、两次竞答、三个综合场景、引导/自主模式 | 每项能解释科普目标，操作方式有差异，前后测试可比 |
| C，上课准备 | 自动保存、报告、教师指引、本地部署和试讲修订 | 刷新可恢复、导出可收集、目标电脑可运行、儿童能独立修正 |

不先承诺具体天数。A 批完成后根据实际开发、图示制作和儿童试用耗时估算 B/C。未通过 A 的可理解性验证，不批量铺开十个活动。

## 4. 文件责任与共同合同

以下路径为计划新增，不能描述成已实现：

```text
classroom/index.html
src/classroom/
  main.ts / bootstrap.ts / navigation.ts     入口、运行及 hash 导航
  shell.ts / styles.css                     页面壳与课堂样式
  types.ts / catalog.ts / source.ts          合同、活动目录、旧内容只读映射
  storage.ts / portfolio.ts                 保存、导入、档案更新
  ui/selection.ts / pointer.ts               选择及可取消拖放
  activities/{history,structure,sensor,traffic}/
    content.ts / state.ts / view.ts / controller.ts / graphics.ts
  competition/content.ts / state.ts / view.ts
  simulation/types.ts / scenarios.ts / engine.ts
  workbench/state.ts / view.ts / controller.ts
  report/model.ts / view.ts / print.css
tests/unit/classroom/
tests/e2e/classroom-*.spec.ts
docs/teaching/2026-11-08-classroom-guide.md
```

旧事实来源：`src/chapters/history/learning-data.ts`、`explore/learning-data.ts`、`lidar/learning-data.ts` 与 `learning-measurement.ts`、`traffic/data.ts` 与 `learning-data.ts`。由 source adapter 选取；新连接、线索与规则文本归课堂 content。不得导入三维 controller/scene/vehicle-rig 或为课堂目的更改旧目标拾取。

共同类型在 `src/classroom/types.ts` 定义；以下为关键外部边界，内部视图函数由实施者决定：

```ts
type ClassroomSection = 'home'|'history'|'explore'|'lidar'|'traffic'|'workbench'|'report';
type Profile = 'guided'|'independent';
type SensorId = 'camera'|'radar'|'lidar';
type Condition = 'uncertain'|'pedestrian'|'red-light'|'clear';
type Action = 'wait'|'safe-stop-alert'|'cautious-go';
interface VehicleConfig {
  sensors: SensorId[];
  budgetEnabled: boolean;
  rules: {condition: Condition; action: Action}[];
}
interface ActivityRecord {
  activityId: string; revision: number; completed: boolean;
  observations: string[]; explanation: string;
}
interface ContestDraft {
  answers: Record<string,string>; submitted: boolean;
  reviewOpen: boolean; corrections: Record<string,string>;
}
interface TestEvent {
  step: number; evidence: string[];
  condition: Condition; action: Action|null; reason: string;
}
interface ScenarioResult {
  scenarioId: string; events: TestEvent[];
  safe: boolean; taskCompleted: boolean; reasons: string[];
}
interface TestRound {
  id: string; createdAt: string; modelVersion: 1;
  config: VehicleConfig; results: ScenarioResult[];
}
interface Portfolio {
  schemaVersion: 1; profile: Profile; section: ClassroomSection;
  records: Record<string, ActivityRecord>; drafts: Record<string, unknown>;
  contests: Record<'q1'|'q2', ContestDraft>;
  config: VehicleConfig; rounds: TestRound[]; reflection: string;
}
```

`drafts` 的每项必须由该活动的解码器恢复，不把 unknown 当作有效 state。活动状态、档案结果、测试 round 分别持有明确责任，图形只消费状态，不独立判题。

## 5. 任务 1：独立课堂入口与只读内容映射

**Files:** 新增入口、main/bootstrap/navigation/shell/styles/catalog/source；修改 `vite.config.ts` 增加原主站和课堂两个 HTML 构建入口；`src/app/shell.ts` 仅增加原生课堂链接；新增 `tests/e2e/classroom-entry.spec.ts`。

**Interfaces:** `resolveClassroomSection(hash:string):ClassroomSection`，非法 hash 回 home；`catalog` 为稳定活动 ID、所属区、目标、基础/选做标记；`mountClassroom(root:HTMLElement):{dispose():void}`。消费旧纯数据，不调用旧 bootstrap。

- [ ] 新建失败用例：直接访问课堂和刷新 `#workbench` 保持课堂；非法 hash 回首页；原站链接为真实文档导航。
- [ ] 运行 `npm run build` 后 `npm run test:e2e -- tests/e2e/classroom-entry.spec.ts`，记录缺少课堂入口导致的失败。
- [ ] 实现入口及壳，所有资源 URL 支持 Vite base；保留现有 chunk 和 CSS 导入顺序。
- [ ] 浏览器记录请求，断言课堂完整导航不请求 GLB/DAE、Three 分包或外网资源；两个入口均能打开。通过构建和该测试后保存本任务改动。

## 6. 任务 2：可操作工作区与学习档案

**Files:** 新增 types、storage、portfolio、ui/selection、ui/pointer；测试 `tests/unit/classroom/storage.test.ts`、`tests/e2e/classroom-input.spec.ts`。

**Interfaces:** `createPortfolio():Portfolio`；`decodePortfolio(raw:unknown):Portfolio|null`；`loadPortfolio():{portfolio:Portfolio; status:'saved'|'memory-only'|'invalid'}`；`savePortfolio(value:Portfolio):'saved'|'memory-only'`；`exportPortfolio(value:Portfolio):string`；`importPortfolio(text:string):Portfolio|null`。键名 `smart-driving-classroom:v1`，只操作本键；导入失败不覆盖当前记录。

- [ ] 编写单测：有效存档往返一致；错误 JSON、未知版本和非法规则返回 null；setItem 抛错返回 memory-only；一轮深拷贝配置不受后续编辑影响。
- [ ] 编写浏览器用例：未落位的拖动取消不提交，点击/键盘完成同一连接；中文组合输入不触发提交；反馈更新保持焦点。
- [ ] 运行 `npm run test:unit -- tests/unit/classroom/storage.test.ts` 和输入浏览器测试，记录尚缺功能的失败。
- [ ] 实现存储读写与输入；交互完成立即保存，文字输入暂停 300ms 后保存，失焦和隐藏时尝试同步写入。刷新恢复已落位草稿；拖动预览不存档。
- [ ] 两标签页修改时显示外部更新提示；用户选择保留本页或载入外部记录前暂停自动落盘，不静默覆盖。损坏原字符串保留至用户明确重置或导入；可下载原记录排查。
- [ ] 扩充上述测试断言多标签冲突和损坏记录不被自动覆盖；验证 200% 缩放下主操作可达、44px 点击区和减少动画路线。通过后保存本任务改动。

## 7. 任务 3：确定性教学引擎、诊断与改进样例

**Files:** 新增 simulation 的 types/scenarios/engine、workbench、traffic 的 T3；测试 `tests/unit/classroom/simulation.test.ts`、`tests/e2e/classroom-improvement.spec.ts`。

**Interfaces:** `validateConfig(config:VehicleConfig):string[]`；`simulateScenario(config:VehicleConfig,scenarioId:string):ScenarioResult`；`runRound(config:VehicleConfig,id:string,createdAt:string):TestRound`。三个场景 ID 和优先级严格采用设计稿；未知场景抛明确错误，不默认通过。

- [ ] 写失败单测 `same_input_same_result`，断言两次 simulate 的结果深相等；`distance_only_cannot_read_light`，无 camera 时信号事件为 uncertain；`conflicts_block_run`，同条件冲突动作不能开始。
- [ ] 写 `waiting_is_not_crossing_completion`：行人离开后仍等待，safe 为 true、taskCompleted 为 false；`rain_safe_stop_completes_task`：不可靠场景执行 safe-stop-alert，两字段均 true；`missing_rule_pauses_without_fabricated_motion`：保护条件无匹配规则，action=null、safe=false；clear 无规则则 safe=true、taskCompleted=false。
- [ ] 写 `repair_changes_uncertain_outcome`：推荐模板首轮 rain-uncertain 的 safe=false，增加 uncertain→safe-stop-alert 后 safe=true 且任务完成；行人与红灯结果保持安全。启用预算时 camera+radar+lidar 总价 100 超过 80，校验失败。
- [ ] 运行 `npm run test:unit -- tests/unit/classroom/simulation.test.ts`，记录缺少引擎导致的失败，再按设计稿第 6 节的完整事件合同实现证据能力与规则求值。camera 单独在两个晴天教学场景可充分，缺 camera 的类别/灯色信息为 uncertain；rain 始终 uncertain。固定谨慎运行，不新增缺乏模型支持的速度参数。
- [ ] 先接 school-crossing 的完整图形和诊断；所有反馈、图形和报告消费同一 result.events。重播仅回放，不新增 round；运行一次追加一个带配置深拷贝的 round。
- [ ] 补齐 signal-change、rain-uncertain 并运行浏览器用例：运行三场景、修改、再测、查看差异、刷新记录仍在。通过单测和浏览器测试后保存本任务改动。

**A 批审阅点：** 至少一次现场操作能看出连接、信息流、错误原因与修复结果。技术通过不等于儿童理解；先记录试用反馈，再铺开全部内容。

## 8. 任务 4：四学习区的十个活动

**Files:** 新增四组 activities 的 content/state/view/controller/graphics；测试 `tests/unit/classroom/activities.test.ts`、`tests/e2e/classroom-activities.spec.ts`。

**Interfaces:** 每组 `mount(host:HTMLElement,portfolio:Portfolio,onChange:(next:Portfolio)=>void):{dispose():void}`；活动输出 ActivityRecord，草稿解码器接受 unknown 返回合法初始/恢复 state；completed 不由播放动画结束事件决定。

- [ ] 对 H1/H2 写错误次序/错配保留已正确部分的规则测试；E1/E2 写四类定位、合法方向链和错误连接反馈测试；先运行该单测文件确认失败，再实现两区。
- [ ] S2 复用现有三轮与区间：[0,10)、[10,20)、[20,40]；测 10/20 米边界及 SVG 缩放不变。S1/S3 写目标不变只切信息/天气、观察记录可恢复的测试；先失败再实现感知区。
- [ ] T1 明确实际可点线索与相关线索；T2 使用给定道路条件判动作；T3 消费任务 3 引擎。写先观察再提交、错误后可改、刷新恢复本题的测试，再实现道路区。
- [ ] 在目录提供必做/选做、引导/自主切换；科学答案相同，不按学年改变判定。每项基础路径一句目标、一个当前操作、一个反馈。
- [ ] 运行上述单测和浏览器测试，逐项走通 H1—T3；S2 提交前不揭示精确距离，200% 缩放和键盘路线可用。通过后按学习区保存改动。

## 9. 任务 5：两次知识竞答与教师阶段指引

**Files:** 新增 competition/content/state/view；修改课堂 shell/catalog；新增 `docs/teaching/2026-11-08-classroom-guide.md`；测试 `tests/unit/classroom/competition.test.ts`、`tests/e2e/classroom-teaching.spec.ts`。

**Interfaces:** `gradeContest(id:'q1'|'q2',answers:Record<string,string>):{score:number;total:3}`；无效或未答按 0 分，正确项各 1 分；提交前允许修改，提交后首答冻结、复习独立保存。题目 ID/选项 ID 稳定。reviewOpen 默认 false，只有已提交后学生主动进入复习才可设 true；题目纠错存 corrections，不改 answers。

- [ ] 写无时间因素评分测试、重复提交不改变首答测试、刷新恢复未提交答卷测试；写 submitted=true/reviewOpen=false 时分数与答案 DOM 尚未呈现、进入复习后显示且刷新保留 reviewOpen 的浏览器用例。运行确认失败后实现。
- [ ] 前台展示本人掌握情况与理由，不展示个人排名；教师阶段入口直达各区，不要求先完成其他活动。
- [ ] 教师指引写清每阶段问题、建议时长、18 对同伴安排、慢生基础路径、快生选做路径以及文件收集办法；第一版无班级联网统计。
- [ ] 通过本任务单测和浏览器用例；核对两次 5 分钟已包含在结构/道路环节，无额外叠加占用。保存本任务改动。

## 10. 任务 6：报告、部署与课堂试讲

**Files:** 新增 report/model/view/print.css；补充 storage、教师文档和 README 的课堂入口说明；测试 `tests/unit/classroom/report.test.ts`、`tests/e2e/classroom-report.spec.ts`。

**Interfaces:** `buildReport(portfolio:Portfolio):ReportModel`；`compareRounds(before:TestRound,after:TestRound):RoundComparison`，两类型在 report/model.ts 导出，包含配置变化、场景逐项前后值及原因。不足两轮明确显示“尚无两轮对比”，相同配置/结果明确“未发生变化”。不生成虚构评价。

- [ ] 单测断言配置变化、无变化复测、不足两轮、损坏导入和多版本不接受；先运行失败，再实现报告和打印样式。
- [ ] 浏览器走通推荐配置首测→改规则→复测→打印预览→导出 JSON→在新浏览器上下文导入→还原配置/记录；开放文本含 HTML 字符按文本展示。
- [ ] 模拟 localStorage 读写失败，报告真实可见并提示未保存，JSON 导出仍可用；大量重复回放不追加测试记录。
- [ ] 运行 `npm run check` 检查新旧流程；以 `npm run build -- --base=/class-demo/` 构建，再用支持该前缀的静态服务验证两个入口、资源和深链接刷新。最后恢复常规构建产物。仅源文档改动阶段不运行这些产品验收命令。
- [ ] 在教室目标电脑和本地 HTTP 服务验证，无外网时课堂资源仍可请求；这不等于双击 HTML 或无服务器离线运行。事先落实共享文件夹/已有平台及文件命名“座位号-学习报告”。
- [ ] 儿童试用至少 6 人覆盖两个年龄段，记录任务耗时、误操作和求助；按设计稿阈值评估、修订、再试。36 机同时打开检查服务和网络，确认硬件性能与教师投屏效果。
- [ ] 生成课堂交付记录：版本、静态部署地址、浏览器、实际运行结果、已知限制、报告收集渠道和教师操作单。没有儿童试用或36机演练时明确标记未验证，不能宣称已可正式上课。

## 11. 整体验收清单

- [ ] 十个短活动能操作并产生真实记录，活动形式覆盖排序、配对、寻找、连接、预测、测量、观察、判断、诊断。
- [ ] 两次竞答各 3 题，成绩有依据，无速度奖励或虚构联网数据。
- [ ] 综合实验三个场景、至少两轮；同输入同输出，能根据原因修正。
- [ ] 从未完成前置活动的首页也能进入综合实验；低年级有推荐模板和短句提示。
- [ ] 全课无实体部件需求，课堂入口无 3D/外网运行依赖。
- [ ] 刷新恢复，存储失败可继续且明确提示，导出导入与打印报告可用。
- [ ] 教师能在150分钟建议节奏内组织活动；真实试讲耗时已记录并据此调整。
- [ ] 现有主站保留，其他未提交方案未被覆盖，最终执行只采用一个明确版本。

本文件交付的是改版计划及开发边界，不是已完成的产品或已验证的课程效果。
