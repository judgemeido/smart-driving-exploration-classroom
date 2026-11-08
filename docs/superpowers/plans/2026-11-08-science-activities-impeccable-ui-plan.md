# 01–03 新活动 Impeccable 二维 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task; if the user chooses agent execution, assign one owner for shared files. 本轮只交付计划。用户已允许未来删除被新页承接的重复学习，按UI6A执行；本轮不删产品代码。步骤中的测试、截图、审核和提交均待实施时执行。

**Goal:** 为三个独立科学活动做出物体可辨、操作直接、反馈有因果、键盘触屏等效的二维界面。

**Architecture:** 新的活动页面拥有独立 main/bootstrap，复用新增的 scoped UI 和 arcade 服务；各活动保留领域 reducer，DOM/SVG 只表现 snapshot。旧纯数据通过只读adapter消费；迁移时修改旧controller/view/CSS撤出重复分支，仅删除无消费者的专属文件。

**Tech Stack:** 现有 TypeScript、Vite、DOM/CSS、几何 SVG、Vitest、Playwright；不新增运行框架，不安装动效库。

**Spec:** [Impeccable 设计规范](../specs/2026-11-08-science-activities-impeccable-design.md)。先读该规范，再读[独立页总计划](2026-11-08-independent-science-games-plan.md)与对应领域计划。本计划负责 UI 的具体工作包，不重新定义计分和科学事实。

## Global Constraints

- 四展厅基础体验和04保留；01主题/任务、02的13挑战、03新学习区由新页承接后撤出重复UI/专属逻辑。源数据和02复习/归位的共用代码不误删；UI6A统一所有权。
- 正文/按钮 ≥18px、辅助说明 ≥16px、点击目标 ≥44×44px；主操作建议48px；禁止整页缩放适配。
- 默认明亮模式；所有新增 token 限定 `.arcade-root`，不依赖原站全局样式。
- pointer/键盘/触屏共用语义动作；拖放是增强，点击与键盘可完成全部目标。
- 动画只消费 snapshot，不推进规则、不发分数。正确目标本局只读，错误草稿局部修正。
- 正式360000ms，练习不限时；教程和预览均在 session.start 之前。教程结束后由用户显式开始。
- 03 小样过交互与视觉门槛后，才把视觉语言铺到三页。
- 当前计划未获实施结果，不能把待执行项勾成完成；不得自动推送或发布。

## Review Focus

- 缩放/滚动/窄屏后点击和拖动仍落在正确对象；SVG 的屏幕坐标不得直接当米制坐标（UI2、UI3）。
- 拖到一半取消、失焦、触屏滚动打断，不残留副本/选中锁/未提交答案（UI2）。
- 初次打开、错误和超长文案时，主操作和关键证据仍可见；底部固定栏不盖焦点或输入法（UI1、UI6）。
- 超时/离页/双标签冲突发生在拖动或动画中，不会先改领域 state 后被 session 拒绝；重练start失败保留上一轮只读成果（UI3、UI6）。
- 正式提示、教程、操作说明三种帮助不混淆；错误反馈和已确认状态不只靠颜色（UI1、UI4–6）。

## 文件和公共 UI 合同

| 路径（相对仓库） | 责任 |
| --- | --- |
| `src/ui/arcade/tokens.css`、`styles.css` | 语义色、字阶、间距、断点、状态，全部 scoped |
| `src/ui/arcade/types.ts`、`shell.ts` | 页头/任务/HUD/工具/主操作的结构与稳定更新 |
| `src/ui/arcade/feedback.ts`、`drawer.ts` | 内联原因/证据、高可访问抽屉与焦点恢复 |
| `src/ui/arcade/selection.ts`、`pointer-drag.ts` | 通用选择/取消/拖放预览，不能判答案或计分 |
| `src/ui/arcade/assistant.ts`、`results.ts` | 两层帮助与真实结果，只消费公共 session |
| `src/activities/{history-lab,structure-lab,sensor-lab}/source.ts` | 只读 import 旧纯数据，转换为本活动内容引用 |
| 每个 activity 的 `view.ts`、`controller.ts`、`styles.css`、`graphics.ts` | 本页结构、局部更新、输入及几何图形；不能互导控制器 |
| `tests/unit/arcade-ui/`、`tests/e2e/arcade-ui.spec.ts` | 纯选择状态单元测试；DOM、取消、坐标、焦点和布局由真实浏览器测试 |
| `tests/e2e/{history,structure,sensor}-lab-ui.spec.ts` | 本页真实任务、错误修正、响应式路线 |
| `docs/engineering/science-activities-ui-verification.md`（实施时创建） | 固定种子、截图路径、实测数据、审核结论及限制 |

公共接口只表达表现和输入，不复制 `ArcadeSnapshot` 或领域规则：

```ts
type UiFeedback = { kind: 'instruction'|'incomplete'|'correction'|'success';
  text: string; objectId?: string; evidence?: readonly string[] };
type UiPrimaryAction = { id: string; label: string; disabled: boolean; reason?: string };
interface ArcadeShellModel {
  title: string; goal: string; stageLabel: string;
  timing: { mode: 'practice'|'contest'; remainingMs: number|null };
  primary: UiPrimaryAction; feedback: UiFeedback;
}
interface ArcadeShell {
  readonly stage: HTMLElement; readonly tools: HTMLElement; readonly evidence: HTMLElement;
  update(model: ArcadeShellModel): void; dispose(): void;
}
createArcadeShell(host: HTMLElement, onPrimary: (id:string)=>void): ArcadeShell;
createActivityDrawer(trigger: HTMLButtonElement, dialog: HTMLDialogElement): { dispose():void };
type SelectionState = { itemId:string|null; targetId:string|null };
reduceSelection(state:SelectionState, action:{type:'select-item'|'select-target'|'cancel';id?:string}):SelectionState;
bindPointerDrag(host:HTMLElement, options:{
  resolveItem:(element:Element)=>string|null;
  resolveTarget:(clientX:number,clientY:number)=>string|null;
  preview:(itemId:string,targetId:string|null)=>void;
  commit:(itemId:string,targetId:string)=>void;
  cancel:()=>void;
}):()=>void;
```

`resolveItem` 未命中返回 null；阈值、capture/cancel 由 bindPointerDrag 管，领域合法性只在 reducer 判断。选中状态可取消；public UI 不拥有 completed/score。shell.update 只更新变化的读数和按钮，不替换 stage/tools 子树、不抢焦点。

## UI1：首屏骨架、token 和真实状态

**Files:** Create UI types/shell/tokens/styles/feedback/drawer，`tests/e2e/arcade-ui.spec.ts`；在集成任务A已建立的`games/sensor/index.html`及sensor-lab main/view上装配初版shell，UI3继续补行为。DOM只在现有Chrome浏览器环境测试，不增加jsdom依赖或生产fixture入口。

**Interfaces:** 生产 `createArcadeShell`、`createActivityDrawer`；消费 `ArcadeShellModel`。初版shell采用03的真实设备/目标文案，不显示虚构完成/得分；浏览器测试打开真实`/games/sensor/index.html`。UI1依赖总计划A的页面入口，UI3另依赖B的session合同。

- [ ] 写失败浏览器用例 `shell_keeps_primary_and_stage_visible_at_1366x768`，断言≥360px舞台和主按钮在视口内；`feedback_preserves_focused_control` 断言更新反馈后同控件仍聚焦；`drawer_restores_focus_and_scroll` 断言 dialog关闭回触发器、背景滚动复原。
- [ ] 运行 `npm run build`，再 `npm run test:e2e -- tests/e2e/arcade-ui.spec.ts`，记录真实sensor入口尚缺shell结构/控件造成的失败。
- [ ] 实现限定根的明亮 UI；反馈仅在确认/阶段变化播报；结果、超长目标、禁用原因、存储未保存均有真实状态。
- [ ] 验证 1366×768 / 390×844 / 320×568；软件键盘场景焦点与输入可见；调色配对实测≥4.5:1，控件边界≥3:1。构建与上述测试通过后记录证据、单独保存该包。

## UI2：选择、拖放、连线等效与取消

**Files:** Create selection/pointer-drag；Test `tests/unit/arcade-ui/selection.test.ts`、`tests/e2e/arcade-input.spec.ts`。

**Interfaces:** 生产上述 selection/drag 接口；controller 将 commit 转领域 action。拖动坐标为 CSS client 坐标，活动 graphics 自己通过 inverse CTM 转换。

- [ ] 写 `cancel_before_drop_never_commits`：pointercancel、lostcapture、window.blur、Escape 均 commit 0 次且 preview被清理；`drop_commits_once`：pointerup后 click不二次提交；`illegal_drop_keeps_original`：无落点取消。
- [ ] 写 `keyboard_and_tap_match_drag`：同卡→同槽的三条路线最终领域 facts相同；`touch_drag_does_not_swallow_page_scroll`：拖柄内能拖，拖柄外能滚，取消后页面仍可滚。仅手机视口不作为触屏手势测试。
- [ ] 运行 `npm run test:unit -- tests/unit/arcade-ui` 及 `npm run test:e2e -- tests/e2e/arcade-input.spec.ts`，记录 RED。
- [ ] 实现鼠标6px/触屏10px阈值、12px候选吸附、稳定DOM、可点“取消选择”、44px命中区域。完成drop前不写领域 state；pointercancel还原所有临时层。
- [ ] 通过上述测试，并在SVG滚动/缩放/窄屏重排后验证落点一致；保存该输入工作包。鼠标、键盘、触屏同档位不改科学容差。

## UI3：03 的一个完整可玩片段，作为视觉门槛

**Files:** Create sensor-lab source/content/scenario/measurement/state/view/graphics/controller/styles；接入 `games/sensor/index.html`；Test sensor-lab unit 与 `tests/e2e/sensor-lab-ui.spec.ts` 的 pulse 子集。

**Interfaces:** 消费 `createSensorScenario/createSensorState/reduceSensorLab/getSensorSnapshot`（03计划）及公共 `createArcadeSession`；生产 `view:string`、`mount(host):ChapterController`。UI1/2 公共组件在这里首次应用。

- [ ] 写失败用例：方向不命中→修正→解锁接收；选Tx发射→回波断在错误端→仅换Rx→成功。空接线不产生incorrect，第一次发射不评接收首次表现；16m对应单程16m、往返32m、106.7ns。
- [ ] 写 `record_rejection_keeps_domain_state`，涵盖有/无facts动作；拖动中超时只进入一次结果，不丢弃已确认事实。重复点击和动画回调不推进第二次。
- [ ] 跑 sensor 单元、构建和 pulse E2E，记录失败；实现纵向片段。候选state先计算，只有 `session.record(facts)===true` 才提交，UI反映已接受的 snapshot。
- [ ] 用鼠标、键盘、合成touch重复这条错误修正路线；初始/错误/成功/结果截图在1440×900和390×844实看，补1366×768首屏检查；减少动画保留静态往返箭头与相同结果。
- [ ] 按规范评分，记录问题和修正。物体不可辨、主操作不在首屏、接错只能读toast、需精细拖动任一项不合格即返工；门槛通过后才能开UI4/5/完整UI6。这不是要求本轮做小样。

## UI4：01 完整轨道与关系装配

**Files:** history-lab source/content/state/view/graphics/controller/styles；`tests/e2e/history-lab-ui.spec.ts`；领域规则按01计划 H1–H4。

**Interfaces:** 消费UI1/2；生产01 view/mount、`HistoryLabTransition`和五个DomainFact目标。不写第二套shell/帮助/结果。

- [ ] 写失败路线：乱序→选单卡插入顺移→检查第一倒置→只改这张→轨道连通；键盘保持同卡焦点；手机竖轨不要求跨屏拖动。
- [ ] 写三场景组装反馈/局部修正、能源三种合法链、未来三槽+可选0–120 Unicode字，IME组合中Enter不提交；超限仍可“不附理由”完成。
- [ ] 按01的对象和关系完成领域 RED/GREEN；实现轨道与场景，避免把排序做成五列密集长卡、把未来卡做成长表单。资料和关联展品是辅助链接，不偷偷离开正式局。
- [ ] 跑 `npm run test:unit -- tests/unit/history-lab`、build及本UI E2E；验收初始/选中/倒置/修复/三条链/最终卡。迁移前既有history E2E保持基线，UI6A再迁移对应学习断言。
- [ ] 固定种子截图并按UI7出审查记录；单独保存01完整活动工作包。

## UI5：02 完整剖面、分组安装和有语义的连线

**Files:** structure-lab source/parts/content/state/view/graphics/controller/styles；`tests/e2e/structure-lab-ui.spec.ts`；领域规则按02 X1–X4。

**Interfaces:** 消费UI1/2及13主题/3图合同；生产02 view/mount与 `StructureLabTransition`。关系图位置来自 graphics 的节点布局，连接真值来自 content，二者不能互相覆盖。

- [ ] 写失败路线：电池错装电机槽→原位提示→替换一件后试运行；正确件保留/锁定；只装悬架不能完成底盘；轮胎的湿滑观察不能自动跳过。
- [ ] 写方向/关系错误的局部删边路线、1起点多终点、窄屏6条感知边不覆盖标签；单一错误关系被删除，所有正确边保持；键盘可完成全部16目标。
- [ ] 固定连线检查边界：动力/支撑/感知分别少于4/4/6条时，即使有错边也只给操作提示、不发事实；达到或超过该条数后非精确requiredEdges集合为有效错误。测试缺边且含错、完整错、多余边、局部纠正四条路线。
- [ ] 实现动力/支撑/感知三张剖面，单次仅当前组4/4/5主题，感知可按选择分步聚焦；安装→关系层在同一空间切换，物体不换位置。新手可先看局部功能，帮助不冒充维修诊断。
- [ ] 跑 `npm run test:unit -- tests/unit/structure-lab`、build和本UI E2E；用真实点击/拖线/删除边验证，不直接灌正确graph。03共同组件修正回归一次；旧explore迁移前回归基线，UI6A后只保留基础体验/复习/归位与旧入口撤出断言。
- [ ] 留下动力/支撑/感知、错槽、错边、删边、正确信息流和结果截图，按UI7出审查记录；保存02工作包。

## UI6：03 完整扫描、测量、天气与竞赛边界

**Files:** Complete sensor-lab source/content/scenario/measurement/state/view/graphics/controller/styles；`tests/e2e/sensor-lab-ui.spec.ts`、`sensor-lab-competition.spec.ts`。

**Interfaces:** 沿用03计划S1–S4与UI3，不替换公共计时/首次表现/存储服务。snapshot为图示、读数、评分的唯一依据。

- [ ] 写失败路线：重复扫槽不增加证据、跳转角度消费中间槽；三个目标每个两槽才完成轮廓。点最近目标、移动尺、误差反馈由同一米制点求出；无靠图标大小作弊的额外答案。
- [ ] 写天气双证据接线、未确认/干扰区分与行动路线；正式天气不可切换；空证据/少一槽不能消耗首次正确资格；摄像头错误组合能换一根线纠正。
- [ ] 实现 scan/distance/weather 三阶段；既有pulse区域和主控制位置保持稳定；三个测量读数同屏，reduce-motion没有丢失证据。
- [ ] 验证正式码/首局锁/未保存/后台继续/离页中断/BFCache回准备页/双标签不互杀；键盘和合成touch按完整路线完成六目标，普通draw/input禁用不能伪暂停时钟。
- [ ] 跑sensor unit、arcade unit、build和新E2E；旧lidar基础体验与traffic保持原断言，新增学习的断言在UI6A移到独立页。按UI7留下天气/距离/中断/存储失败证据，保存03完整包。

## UI6A：迁移承接完成后撤出重复旧学习

**Owner:** 集成负责人串行执行，三个活动作者不并行改旧控制器。前置UI4/UI5/UI6已分别通过知识与交互验收。本轮只规划，实际删除在未来实施阶段。

| 旧模块 | 修改/删除范围 | 必须保留 |
| --- | --- | --- |
| history controller/view/gallery.css | 撤出主题/任务入口、学习DOM、事件、pagehide学习清理；无消费者后删除learning-view.ts、learning-state.ts及专属测试 | data/render、14展品/档案、年份定位；learning-data.ts仍由新source引用，保留 |
| explore controller/view/styles.css/learning-view.ts | 撤出`data-learning-start`、`data-explore-learning`和13挑战输入/状态/教学热点；learning-view.ts只删renderExploreLearning及专属辅助，保留另两条渲染 | 原三任务、模型/分类/聚焦/开合/灯光、动力故事、renderExploreReview、renderExploreAssembly、assembly-state/rig/camera-observation与共享data/targets |
| lidar controller/view/exhibit.css | 撤出guide/world/distance/weather学习入口、标签、输入、教学场景与逐帧分支；无其他消费者后删除learning-view/state/world、weather-state、learning-camera等专属文件 | 8部件/4步/模式/5–80m/720点/扫描暂停/模型降级；learning-data及其measurement依赖若仍被source消费必须保留 |
| tests/e2e/*-learning、learning-route及对应unit | 将知识、错误修正、输入、结果覆盖迁至三个新活动；删除的控制器专属用例随实现替换，不能只把旧断言删空 | 旧基础功能、02复习/归位、04全部、资源失败/生命周期/导航回归；增加旧重复入口不存在断言 |

**Interfaces:** 新source只导入保留的纯数据；01排列/文本辅助在新活动自身rules/state实现，不引用待删旧learning-state。判断文件可删前用rg追踪生产和测试消费者；最终清单记录到验收文档，每文件注明知识承接位置/保留原因，不执行模糊目录级删除。

- [ ] 先写迁移后验收：旧01主题/任务面板不存在、旧02十三挑战入口/面板不存在、旧03新学习入口不存在，三个真实游戏链接可用；目前旧界面仍存在因此RED。
- [ ] 逐章撤出旧学习分支，只删无消费者的专属文件；共享CSS选择器/事件/相机恢复不得误删保留功能；新游戏的资料、排序/13主题/六传感器知识均能追溯到原事实。
- [ ] 调整旧学习测试为“新页承接覆盖+旧入口撤出+基础功能保留”，而非放宽断言；用真实用户路线分别验收旧02三任务/复习/归位和旧03测距/扫描/降级。
- [ ] 运行unit/build/受影响新旧E2E；rg确认旧controller不再挂载废弃学习状态/场景且无悬空import。记录真实删除文件及对应消费者审计，单独保存迁移包，再运行UI7全套检查。

## UI7：完整视觉、交互与保留回归门槛

**Files:** New UI E2E与实施验收记录；必要时修正新活动/公共UI或UI6A迁移范围。不要扩展重做旧基础展品。

**Interfaces:** 输入固定内容种子 `7K2M4C`，样本按G/S档分别生成；输出可追溯的审核表、截图和动作记录。

- [ ] 串行执行 `npm run check`；记录真实测试总数/退出码，不抄上一轮191/69作为新验收。生产预览使用现有Playwright配置4173；浏览器测试前构建，不能多个进程写dist。
- [ ] 按规范11节矩阵批量查看三页；核对初始/错误/成功/结果和每页专属状态。截图逐张打开，防止黑屏/错页/动画半帧；手机触屏路线另外保留动作证据，截图不能代替。
- [ ] 运行安装路径的 `impeccable.cmd detect --json src/activities src/ui/arcade`，人工核实每条；再对运行中的三个新页面测实际文字对比和布局。引擎不可用记录具体错误并做人工测量，不能称自动检测通过；缺失自动检测项仍列入发布前检查。
- [ ] 用 `$impeccable audit` 检查五维，`$impeccable critique` 检查任务路径和10项启发式；独立agent流程按安装版本执行：有工具且未授权则先按技能提问，获准后运行；用户拒绝/无工具时才按该技能条件降级并标注，不能自行跳过申请。修正顺序：adapt/harden→layout/clarify→animate→polish。
- [ ] 验收≥17/20、各维≥3与≥34/40；P0/P1清零。记录首次尝试操作与提示阅读路径，儿童课堂试验单独标待验证，不用分数代替。
- [ ] 对照开工基线和UI6A清单确认：只撤出被新页承接的旧学习，其余基础展品/02复习归位/04保持；游戏网络无Three/GLB/DAE，资源体积/输入响应达预算。app改动限独立页/导航接线。
- [ ] 自查本地文档链接、实现对应关系和遗留问题；如用户授权Git保存则按完成包保存，最后交付三地址、维护入口、截图与实测限制，不推送/发布。

## 执行决策

本轮到规划为止。共同UI/输入和03片段为前置；其后01/02/03领域可在明确文件所有权下独立实施，构建、浏览器、Git保存仍串行。先做可玩的因果片段，再补全，不先画三套静态页面再临时拼规则。
