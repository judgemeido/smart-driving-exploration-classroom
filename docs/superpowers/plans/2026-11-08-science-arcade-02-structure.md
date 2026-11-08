# 02 系统维修台 · Impeccable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement task-by-task. 本轮只重做计划，未实施；公共文件由集成负责人拥有，旧结构基础互动/复习/归位保留，重复13挑战按UI6A撤出。

**Goal:** 在可辨认的汽车几何剖面里补装部件、连出功能关系、看到系统如何配合。

**Architecture:** `/games/structure/index.html`独立二维页；`/index.html#explore`保留模型、原三任务、复习、归位和动力故事；13项旧挑战由新游戏承接后撤出。新source只读现有纯教学数据和目标说明，不移动旧导出、不加载旧controller/rig/scene/Three。

**Tech Stack:** TypeScript、Vite、DOM/CSS、几何SVG、Vitest、Playwright，不增加游戏/动画框架。

**Spec:** [Impeccable 二维设计规范](../specs/2026-11-08-science-activities-impeccable-design.md)和[UI实施计划](2026-11-08-science-activities-impeccable-ui-plan.md)决定剖面构图/输入/反馈；[集成总计划](2026-11-08-independent-science-games-plan.md)与[计分附录](../../engineering/2026-11-08-science-arcade-scoring.md)决定公共合同。

## Global Constraints

- 13主题按4动力/4结构/5感知保留，另3个功能关系图，共16目标；新页是教学图示，不是真实车型维修或GLB拾取。
- 旧13项启动器/面板/专属控制分支在新页承接后撤出，对应学习覆盖迁到新E2E；基础控制/复习/归位不删。
- 只显示当前组，不一次铺满13件；手机按当前系统放大，不缩小全车。
- 安装阶段与关系阶段分开；同一物体不同时承担移动和连线手势。局部错误局部改，已确认目标本局只读。
- 18px正文/按钮、16px辅助、44px目标；所有拖放/连线有点击和键盘等效路线。
- 默认练习，正式360000ms；教程后显式开始，阶段成功主动继续；hidden继续预算，离页中断。
- 图示不承诺制动距离、绝对安全/无盲区；毫米波部件/槽位/成果都标教学示意。

## Review Focus

- 悬架与制动共同完成底盘；不能用两个悬架或单独万能部件替代（X1/X2）。
- 重复边、未知端口、反向边、跨组边、同revision验证不刷分（X2）。
- 取消拖线/缩放/手机重排不留悬空输入或把边连到错误端口（X3）。
- 正确安装/正确连线被保留，错一条边不重做全部；确认后依赖件不能撤走（X2/X3）。
- 原三任务、复习、归位与故事保持；旧13挑战撤出，新活动reset不触发旧action（X4）。

## 来源适配

新`source.ts`只读引用原`learning-data.ts`的13主题和分组、`learning-targets.ts`的模型事实。新图示ID与真实模型节点字段分开；不改旧模型映射或评分。原已有文案为唯一知识源，新content只定义图示槽位/边与解释引用。

## 三张台面与实际操作

在`/games/structure/index.html`独立host内部，按Impeccable规范第4/8节构图：HUD显示三组进度/计时，汽车几何剖面为主体，短证据栏辅助，部件托盘与唯一主操作在图下。这段左右布局只属于独立2D游戏，绝不与旧3D模型并排。移动端托盘在图下。02两个页面切换按钮位于主内容之外；新页不含explore-workbench/model-canvas/GLB，教程和结果也只在新host。

### 机制 1：看缺失现象，选择部件并安装

不是模拟真实故障诊断：提示明确“这张教学图缺少几项功能，请补齐”。每组有现象标记，学生点现象可看短动画/静态说明，再选具备相应功能的部件，放到剖面大槽位，按“试运行”检查。轮胎先接触路面、悬架连接车身与车轮、摄像头观察方向等要在台面里看得见；部件卡用外形和功能短句，不是重新包装 radio 选项。

正确安装后固定该部件，播出对应局部功能，如电池出现电能标记、电机转动、悬架缓和路面起伏、摄像头把图像送入信息箱。错误只指出“这个槽需要哪类功能”，保留全部正确件、把错误件留在槽中供替换；不扣拖放动作分，也不把整张图清空。额外“给我一个部件提示”可揭示一个 part↔socket 关系，明确标记该主题已用提示。

| 台面 / 内容 ID | 必须进行的动作与功能证据 | 图示完成含义 |
| --- | --- | --- |
| 动力 `explore-energy-battery` | `part-battery` 放 `socket-power-battery`，试运行看电能从储能盒输出 | 在教学图识别储能，不宣称找到实际 BatteryPack |
| 动力 `explore-energy-motor` | `part-motor` 放 `socket-power-motor`，电能进入后显示转动 | 电机负责转化，不能用电池代替 |
| 动力 `explore-energy-transmission` | `part-transmission` 放 `socket-power-transmission`，齿轮传递转动 | 不把减速/差速机构认作传统车型全部变速箱 |
| 动力 `explore-energy-wheel` | `part-wheel` 放 `socket-power-wheel`，轮胎与路面接触后能显示前进箭头 | 认识动力最终要作用于路面；前进是示意 |
| 结构 `explore-structure-body` | `part-body` 放 `socket-support-body`，提供承载/连接框架 | 不声称车身绝对抗碰撞 |
| 结构 `explore-structure-suspension` | `part-suspension` 放 `socket-support-suspension`，连接车身与轮胎并缓和起伏 | 不声称完全消除颠簸 |
| 结构 `explore-structure-chassis` | 悬架已安装，另将 `part-brakes` 放 `socket-support-brakes`；同时有悬架与制动才可确认底盘主题 | 底盘是多个系统，不能用两个悬架或一个“底盘零件”完成 |
| 结构 `explore-structure-wheel` | 同一个 canonical `part-wheel` 在新的 `socket-support-wheel` 放置；由初始 dry 切至 wet，试运行查看接触关系说明，湿滑观察是此主题确认的第二条件 | 是轮胎/路面主题的新操作，不用动力轮胎动作自动完成；无虚构停车距离 |
| 感知 `explore-sensor-front-camera` | `part-camera-front` 放 `socket-sensor-front`，看前方道路图像进入信息箱 | front 为方向功能，不等同 GLB 命中 |
| 感知 `explore-sensor-surround-camera` | `part-camera-surround` 放 `socket-sensor-surround`，展开侧后方图像窗口 | 不承诺没有盲区，不推断真实摄像头数量 |
| 感知 `explore-sensor-lidar` | `part-lidar` 放 `socket-sensor-lidar`，激光往返出现距离点 | 顶部位置是图示，不取得实际 Roof_lidar_housing |
| 感知 `explore-sensor-millimeter` | `part-millimeter-teaching` 放独立 `socket-sensor-millimeter-teaching` 小框，显示无线电波回波 | 框/卡/成果三处均标“教学示意”，不在真实车型上增设虚构 GLB 部件 |
| 感知 `explore-sensor-ultrasonic` | `part-ultrasonic` 放 `socket-sensor-near`，观察车旁近物的声波回波 | 近距用途，不假称可可靠观察遥远道路 |

每张台面一次“试运行”核验所有已填槽；缺槽只显示未完成，不记错误。已填但功能不符才产生该 objective 的 incorrect fact；正确主题第一次完成发 correct fact 并锁定该主题安装。错误件可任意改；正确件不移走，无须重新刷一遍。结构底盘的 brakes 安装不另建第 14 个任务，归入原 chassis objective。

### 机制 2：连出功能关系，修复整组系统

安装正确后台面出现关系端口，学生“选起点 → 选终点 → 选关系标签”，或拖线后选标签，再按“验证系统”。每组所有必需关系成立才完成该组；错误用文字说明首个错连点，例如“电池提供电能，不能跳过电机直接变成车轮转动”，并把错线标虚线，允许选线删除/重连。图上任何连接都叫功能关系，不伪装维修线束。

| 关系目标 ID | 全部必需边（source→target : relation ID） | 验证后的观察 |
| --- | --- | --- |
| `structure-link-power` | battery→motor:`electric-energy`；motor→transmission:`rotation`；transmission→wheel:`rotation`；wheel→road:`contact-force` | 依次亮起储存→转化→传递→路面作用，补齐前只显示局部已完成步骤 |
| `structure-link-support` | body→suspension:`support`；suspension→wheel:`support`；brakes→wheel:`slow-rotation`；wheel→road:`contact-force` | 干燥/湿滑仅切换说明及接触表现：加速、转弯、减速依赖接触，不能承诺固定制动距离 |
| `structure-link-perception` | front-camera→processor:`image`；surround-camera→processor:`image`；lidar→processor:`laser-distance`；millimeter-teaching→processor:`radio-target`；ultrasonic→processor:`near-distance`；processor→driver-action:`analysis` | 图像与不同回波先收集信息，计算分析后给出提醒/合适行动；“驾驶行动”不自动宣称是完整自动驾驶或绝对安全 |

source/target 的 graph ID 是 `node-*` 前缀，对应以上 canonical part，processor/driver-action/road 是教学步骤卡而非新增需寻找的模型部件。连线有方向、固定关系类别；guided 显示端口类别图标和文字，standard 不显示目标幽灵线，并在当前托盘放 1–2 张已有部件作为干扰。规则不因档位改变。

三组安装 + 连关系的目标操作时间约为动力75秒、支撑75秒、感知90秒，360秒设计默认另外留出反馈阅读和纠错时间；具体可用性需真实儿童测试。第一组完成后主动“下一台”，不自动切走说明；比赛未完成也可看到真实部分结果。最终显示13个主题图示完成状态、3个关系图和一条可选收藏，不追加问答或按表达质量打分。

教程用非正式“台灯电源→灯泡”的二维演示，先完成选件/放槽，再完成选起点/终点/标签；约20秒，不计时/计分、不发 objective facts。开始前只有未计分预览/教程，教程后返回准备确认，学生显式开始才启动练习/比赛 session；主学习操作的有效检查才产生计分事实。共同 `src/ui/arcade/assistant` 从当前 board、错误 ID、hint 次数选择固定台词，不假装理解自由文本。每个局部动画400–700ms，状态先提交且可略过/重播，reduced-motion 用静态替代；连对火花只是装饰，不加分。

## 状态机与本地接口

`briefing → tutorial → install(power) → link(power) → group-feedback → install(support) → link(support) → group-feedback → install(perception) → link(perception) → result`。安装错误与连线错误作为同阶段 feedback，读后继续改当前草稿；成功只解锁 next，不自动跳组。公共 timeout 从任何比赛阶段进入 result 并冻结草稿，不自动完成剩余主题。

```ts
type StructureLabBoard = 'power' | 'support' | 'perception';
type StructureLabProfile = 'guided' | 'standard';
interface StructureLabConfig {
  readonly mode: 'practice' | 'contest';
  readonly profile: StructureLabProfile;
  readonly challengeCode: string;
  readonly contentVersion: string;
}
interface StructureObjectiveFact {
  readonly objectiveId: string;
  readonly revision: number;
  readonly verdict: 'correct' | 'incorrect';
  readonly usedHint: boolean;
}
interface StructureLabTransition {
  readonly state: StructureLabState;
  readonly facts: readonly StructureObjectiveFact[];
}
createStructureLabState(config: StructureLabConfig, content: StructureLabContent): StructureLabState;
reduceStructureLab(state: StructureLabState, action: StructureLabAction, content: StructureLabContent): StructureLabTransition;
```

state 包含 config、stage、boardId、installedBySocket、edgesByBoard、selectedPartId/selectedPortId、surface:'dry'|'wet'、feedback、revisionByObjective、lastCheckedRevision、completedObjectiveIds、hintedObjectiveIds、finishReason。总分、时钟、模型状态不在本地 state。actions 为 `start/tutorial-complete`、`select-part {partId}`、`install {socketId,partId}`、`select-port {nodeId}`、`connect {sourceId,targetId,relationId}`、`remove-edge {edgeId}`、`surface {value}`、`check-install`、`check-links`、`hint {objectiveId}`、`continue`、`finish {reason:'completed'|'timeout'|'abandoned'|'interrupted'}`、`reset-practice`。正式 finish/status 和 outcome.finishReason 均使用这四个值。

- check 输出 fact 的边界是一个 semantic objective 的首次有效确认，重复不变检查或 incomplete 检查无 fact、也不递增 revision。安装空槽仅提示、已填错功能为incorrect。连线图按requiredEdgeCount(动力4/支撑4/感知6)判断是否完整：少于该数时即便有错边也只提示、facts=[]；达到或超过该数时，必须与requiredEdges集合精确相等才correct，否则一次incorrect。未知/重复/跨组边在编辑时拒绝，不进入草稿；合法但多余的边属于完整错图。session.record 内部绑定 runId/seq，草稿 revision 不是运行全局序号。
- 每个 semantic objective revision 只在有效实质草稿编辑时加一；支撑的 chassis revision 取悬架/brakes 依赖的共同 board revision。已正确确认的悬架/制动依赖件锁定，当前run不存在完成后删除依赖再保留旧确认的路径。
- 13 项正确安装分别确认；一个完整关系图另确认一次。全部安装正确前不进入 link，全部 required edges 正确前不进入下组。
- 允许一条 source 多个 target，但禁止完全重复的 `(source,target,relation)` 边；未知端口/类别、同端口自连、跨 board 连线、完成后的编辑无效。
- 比赛与练习的当前run中，已完成目标一律只读，可回看此前反馈；修改已完成件/关系必须开始全新一轮，不提供单目标 uncompletion 或撤回事实。
- `reset-practice` 重置整轮而非本组：若旧practice session仍running，先 `session.finish('abandoned')`，再调用 `session.start(practice config)`；仅ok才用 `createStructureLabState` 重建全轮。start失败保留旧轮只读成果和原因，不清空图也不显示running新局。旧session已结束时不重复finish；score/elapsedMs继续为null。正式再赛也必须另开新run。
- reducer不读DOM/Three/时间/localStorage；主关卡守卫active+running。hidden禁用输入但继续时钟；新文档导航/pagehide结束正式run，含BFCache；dispose解除监听/订阅，返回ready。

## 锁定的权重、计分与诚实结果

13 个现有 task ID 每项权重40，共520；3个 `structure-link-*` 每项权重160，共480；权重和1000。这些数是内容权重，不是每项实际最终分。原 chassis 的制动/悬架两条件共一项，毫米波不额外奖励。显式部件/关系提示作用于一个 objective，其 usedHint 会保留到首次正确 fact，不能隐式影响其他主题。

唯一共享公式为 `score = floor(.7 * earnedWeight) + floor(.2 * firstCorrectWeight) + (completed ? floor(100 * clamp((360000 - elapsedMs) / 180000, 0, 1)) : 0)`，由 `src/shared/arcade/scoring.ts` 实现。纠正后仍可获得完整70%完成贡献；每项第一次有效检查决定首次正确资格，第一次错误或首次正确前使用显式提示均不能进入 `firstCorrectWeight`。缺件/未知输入不属于有效检查；常驻操作引导不是提示。只在全部目标完成时加速度贡献，连对仅装饰火花、不加分；教程、动画等待、字数不计分。全部首次正确且180秒内完成为1000，300秒为933；一项40权重先错再正确、180秒内全完成为992。

公式只适用于正式比赛；练习结果的 `score` 与 `elapsedMs` 均为 `null`，不以0分/0ms冒充练习成绩，练习不进入比较记录。

新页只发 `{objectiveId,revision,verdict,usedHint}` facts，`session.record(facts)` 的公共适配器内部绑定 runId/seq、去重；本地不能设置事件运行 ID 或另存累计分。共享运行模块为 `src/shared/arcade/{types,session,scoring,storage,challenge-code}.ts`，共同 UI 为 `src/ui/arcade/{shell,results,assistant,styles}`。本页 `activityId` 为 `structure-lab`，稳定卡序来自 challenge-code，比较键精确为 `activityId + challengeCode + profile + contentVersion + scoringVersion + durationMs`。

专用bootstrap挂载页面拥有的ArcadeSession，接口保持start/record/finish/subscribe/setActive/dispose，共享拥有时钟、去重/finalize。hidden继续比赛时钟；真实按钮导航/pagehide/刷新结束正式run为interrupted/unranked，含BFCache persisted=true。返回pageshow从ready开始不恢复正式run；练习状态仅当前document内有效。共同游戏导航使用真实href，不保留mounted run跨文档。

共同 results 注明“二维教学图示”；每项状态来源 `diagram`，毫米波再标 teaching。不能生成 model evidence 或维修胜任判断；准确展示本轮核验的安装/关系、真实部分结果和实际本机记录。比较只使用上述完整比较键；现场横向比较靠同学展示真实结果屏，公共说明明确各电脑只有自己的历史。

## 文件与任务

新增`src/activities/structure-lab/{source,parts,content,state,graphics,view,controller,index,main}.ts`和`styles.css`；入口`games/structure/index.html`。source只读旧事实；parts为几何物体定义；content为槽位/真值关系；state为唯一reducer；graphics为可辨物体/端口布局；view保持对象DOM；controller使用公共输入和session。旧文件的迁移/删除按公共UI6A由集成负责人实施，复习/归位的共用learning-view部分不能误删。

### X1：只读13主题与图示内容

**Files:** source/parts/content；`tests/unit/structure-lab/content.test.ts`。

**Interfaces:** `getStructureSource()`返回旧tasks/groups/targets只读引用；`DiagramPart {id,label,functionLabel,sourceTargetKeys,teachingOnly}`；`DiagramObjective {id,boardId,requiredSocketParts,sourceTaskId,weight}`；模型source key与diagram ID分字段。

- [ ] RED：13主题ID恰好覆盖一次、分组4/4/5、轮胎单一定义两场景引用；悬架+Brakes满足底盘、两悬架不满足；13×40+3×160=1000。
- [ ] RED：毫米波全链标teachingOnly，三图所有端口存在、边带正确方向/语义；diagram证据绝不标model命中。
- [ ] 跑`npm run test:unit -- tests/unit/structure-lab/content.test.ts`；实现只读adapter与操作内容后跑GREEN及旧explore内容测试，不移动导出或改变旧对象。

### X2：安装与关系reducer

**Files:** state；`tests/unit/structure-lab/state.test.ts`、`graph.test.ts`。

**Interfaces:** 上文createStructureLabState/reduceStructureLab；13安装目标+3图目标；DomainFact使用共享类型，不另定义评分。

- [ ] RED：安装空槽facts=[]、填错功能incorrect；连线少于4/4/6条时即便含错边也facts=[]，达到/超过条数而非精确requiredEdges为incorrect；更正只改变未完成草稿；已确认件/边锁定；同revision check无重复fact。
- [ ] RED：chassis同时检查悬架+制动；支撑轮胎必须看wet；合法source多target可用，自连/重复/跨board/未知边拒绝；主动continue只过一组。
- [ ] RED：动力图只有1条合法端口但关系错误的边时check返回facts=[]；凑足4条而有错为一次incorrect；改至精确4条requiredEdges为correct且首次资格已失。支撑4/感知6同样；额外合法边需删掉才能成功。重练start失败保留上一轮图/成果，只读显示原因。
- [ ] 实现唯一领域状态与局部验证，任何动画不推进；试运行处理所有已填安装槽，各目标独立事实，不因一错丢掉其他正确确认。
- [ ] 跑`npm run test:unit -- tests/unit/structure-lab`，覆盖提示锁、timeout冻结、重练新run；记录GREEN后保存。

### X3：三张二维剖面与原位纠错

**Files:** graphics/view/controller/styles；`tests/e2e/structure-lab-ui.spec.ts`。

**Interfaces:** view:string/mount(host):ChapterController；消费公共UI1/2，不写第二套选择/取消/拖动。字段安装和边数据来自state，位置来自graphics。

- [ ] RED：错装电机槽→文字锚定槽→换一件→试运行；四/四/五组均可辨；感知连线错误→点选只删错边→保留所有正确边→看到真实流向。
- [ ] RED：全键盘完成16目标、触屏tap/拖线cancel、焦点/手机滚动；同组install→link物体不跳位置，禁用给原因；连线标签不覆盖对象名。
- [ ] 实现几何剖面、56px优先槽位、关系阶段端口、可选边的宽命中区；错误边用断线+文字，不只红色；400–700ms试运行可略过，reduced-motion有静态顺序。
- [ ] build后跑本UI E2E并实看动力/支撑/感知/错槽/错边/成功截图，按UI5/UI7门槛修正；不直接灌正确图数据。

### X4：独立文档、真实结果与旧学习保留

**Files:** index/main/HTML及controller集成；`tests/e2e/structure-lab-competition.spec.ts`，开发指南追加双入口说明。

**Interfaces:** 公共session record返回true才提交候选state；控制器不分发旧mission/powerflow/learning/assembly动作；独立bootstrap持有page生命周期。

- [ ] RED：同码同动作假时间同分、record拒绝state不动、hidden继续预算、导航/刷新/BFCache中断且返回准备、双标签不互杀、存储失败结果仍可读。
- [ ] 实现真实结果：13主题图示状态、3关系图、未完成项，不假称真实GLB装配报告；练习score/elapsedMs=null。
- [ ] 跑structure/arcade单元、build、新旧explore浏览器路线；**旧13挑战入口和面板已撤出，其知识/纠错覆盖在新页通过**，三任务/复习/归位/开合/分类/灯光/镜头/5秒故事保留。旧学习E2E改为承接覆盖+旧面板不存在+基础功能保留，不能只删除断言。start失败保留旧成果的回归通过。
- [ ] 无Three/GLB/DAE网络请求，游戏root无旧model-canvas；新旧各在自己文档，不共享运行state。按UI5/UI7记录全尺寸和输入证据，再保存交付。

## 交付边界

本版按用户最终授权撤出重复13项挑战/专属逻辑，保留原三任务/复习/归位及基础交互。科学纯数据作为单一来源继续使用，新旧不在同文档挂两工作台。三张剖面要能通过真实输入解释功能关系，不能把radio题改成部件卡即声称游戏化。全部任务尚未实施。
