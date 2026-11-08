# 01 进化修复站 · Impeccable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement task-by-task. 本轮只重做计划，未实施。共享文件仅集成负责人写；原基础展品保持，新页承接后旧重复学习按公共UI6A撤出。

**Goal:** 让学生在真实可操作的二维时间轨道、需求装配和未来说明卡中理解汽车发展片段。

**Architecture:** `/games/history/index.html`独立main/bootstrap，仅挂本游戏；既有`/index.html#history`保留14展品与年份/档案，新页承接后撤出旧主题/排序/匹配/未来学习。新页通过source adapter只读引用已有纯数据，不搬迁旧文件，不引用旧控制器。

**Tech Stack:** TypeScript、Vite、DOM/CSS、几何SVG、Vitest、Playwright；不加载Three/模型/在线AI。

**Spec:** [Impeccable 二维设计规范](../specs/2026-11-08-science-activities-impeccable-design.md)和[UI实施计划](2026-11-08-science-activities-impeccable-ui-plan.md)为视觉与交互依据；[集成总计划](2026-11-08-independent-science-games-plan.md)和[计分附录](../../engineering/2026-11-08-science-arcade-scoring.md)为公共合同。

## Global Constraints

- 新活动是独立HTML；既有历史14展品/年份导航保留，主题/任务知识在新活动承接后撤出旧重复UI及专属逻辑；测试迁移覆盖，不只删除断言。
- 三个机制，不追加选择题测验；主题资料是按需阅读。历史五卡是馆内发展片段，不代表完整世界汽车史。
- 现有`historyLearningContent`和展品为史料真源；新content只新增操作模块/关系，不复制一份历史正文。
- 练习默认、正式360000ms；教程和预览不计分/计时，教程之后仍要显式开始。
- 同档位同码相同乱序/容差/权重。已完成目标本局只读，重练开启新run，重复确认不刷分。
- 自由理由0–120 Unicode字可选、只存内存，不评观点或字数；所有输入按文本处理。
- 所有UI状态/输入/响应式/动效遵循Impeccable规范；18px正文、16px辅助、44px目标。

## Review Focus

- 五卡重复/缺卡/越界、同revision重复检查和插入重排（H2）。
- 选中卡跨布局重排后焦点和物体身份不丢失；拖动取消不提交（H2/H4）。
- 能源多种合法链共存，不额外得分；局部错误保留正确槽（H3）。
- 中文IME/表情/HTML/超长理由不造成提前提交、脚本或卡住正式完成（H3/H4）。
- 新旧两页数据和reset互不污染；hidden/离页/返回遵守公共合同（H4）。

## 内容与画面入口

旧`learning-data.ts`和`data.ts`保留为知识真源；新source只读引用数据，不引用待删learning-state。旧主题/任务controller/view分支按UI6A撤出，排序/文本纯辅助由新活动rules/state拥有。五主题origin/production/energy/sensing/future和五事件ID保持；01画面按设计规范7节制作。

## 具体画面与操作循环

构图按Impeccable规范第4/7节：明亮科学操作桌，五站轨道是首屏主体；桌面约72%舞台/28%短证据，手机变竖向轨道。工具只出现当前步骤所需对象，主操作唯一；辅助文字至少16px、正文/按钮至少18px。颜色、状态、动效和输入按公共规范，不另建深色工作台。

### 机制 1：修复时间轨道，建议约 65 秒

五辆“事件货车”带年份和一句事件摘要，停在错乱的轨道上。学生选一辆，再点“放到第 n 站”，或拖到五个大槽位；移入时其他卡顺移，最后按“检查轨道”。正确顺序开动一辆小车逐站经过，年份、事件和一条资料解释同步出现，仍须主动点击“下一站”。

检查错误时停在第一对时间倒置处，指出具体两张年份的先后，不将错卡扔回起点。资料抽屉可查看关联展品；“给我一个位置提示”显式揭示下一张应移动的卡和目标位置。修好后显示“研究、示范、环境感知与补能建设可以相互支持；不是一种技术消失，另一种才出现”。不要求凭记忆背五个年份，也不把简单日期排序当完整历史理解。

### 机制 2：把需求变成方案，三回合建议约 100 秒

台面切换为工厂/补能站/校门口三幅静态场景，需求和结果可见；每回合都使用相同规则“选模块 → 放入关系槽 → 试运行”，不是选一个答案后读对错。

| objective ID | 操作与接受的关系 | 试运行反馈 |
| --- | --- | --- |
| `history-efficiency` | 将“分步骤加工 → 连续工序配合”模块放在生产流程两个槽，建立方向；带提示只有这两张和车灯/颜色干扰，标准档增加“每人独自从头做完” | 正确时半成品沿工位流动；错误时指出选中的模块改变外观或缺少工序配合，不宣称虚构真实产量倍数 |
| `history-cleaner-energy` | 在纯电、混合动力、氢燃料电池三个可切换教学方案中任选一条，在“来源/转化/运动”三槽补齐方案；具体模块见下表，切换方案不重新得分 | 路径显示“储存/转化/运动”，明确多方案并存；完成后固定说明还需考虑能源来源、制造和使用条件，不产生虚构排放百分比 |
| `history-complex-road` | 摄像头或雷达输入→计算分析→合适行动，三个槽；需将已有“观察设备与计算系统配合”概念拆成实际步骤 | 正确时道路信息传入分析区，再出现“提醒/减速”；仅接观察设备不会直接使车自动安全，不承诺零事故 |

三回合的角色、卡片和条件由内容表定义；能量方案的分支是同一组装机制，不新建驾驶/经营模拟。错误保留已装模块，指出首个不成立的关系和原因，学生只需替换相关槽。试运行是提交边界，拖放过程中不扣分；每回合正确后读反馈，再主动继续。

能量回合三个槽固定为 `energy-source/energy-conversion/energy-motion`，接受以下完整路径，不要求画出未教学的内部线束或全部混动架构：

| plan ID | source module | conversion module | motion module |
| --- | --- | --- | --- |
| `energy-plan-battery` | `energy-source-battery`：电池里的电能 | `energy-convert-motor`：电机把电能变成转动 | `energy-motion-wheel`：传动配合车轮运动 |
| `energy-plan-hybrid` | `energy-source-hybrid`：燃油与电池的电能 | `energy-convert-hybrid`：发动机与电机按方案配合 | 同一 `energy-motion-wheel` |
| `energy-plan-hydrogen` | `energy-source-hydrogen`：氢与氧参与反应 | `energy-convert-fuelcell`：燃料电池发电，再由电机转动 | 同一 `energy-motion-wheel` |

三种 plan 的卡不是三道单选题。学生选一种要探索的方案，亲手把来源、转化和运动连贯放进三个槽；只有该方案完整一致才确认，同一个 `history-cleaner-energy` objective 不因切换或探索全部方案多得分。混动模块标“组合示意，不代表所有混动车型的同一种内部结构”。

### 机制 3：造一张能解释的未来汽车卡，建议约 55 秒

学生在小车侧面选择能力徽章，再挑“帮助谁/解决什么问题”情境与“还需要什么条件”卡；三槽同时展示一句可读解释。四组基础合法关系：`future-safety`→学校附近行人/可靠探测与合适行动；`future-energy`→补能不便的出行者/补能设施与能源条件；`future-accessibility`→不同乘坐需要的人/适合的入口与人机界面；`future-comfort`→乘坐者/路况与悬架座舱等配合。每组两张情境写法可选，能力之间不排名。

按“保存说明卡”只核验三张选卡属于已公布的合法关系。错误例如把“补能方便”配成“所有道路风险消失”，显示关系为何不成立，并保留选择供替换。成功显示三槽说明和“这是你的设计选择，游戏没有评价你的观点优劣”。开放理由 0–120 Unicode 字可选，空白也完成；超过 120 字保留原文并提示精简/不附理由，不能因此卡住比赛。标准档鼓励写“因为…还需要…”，但分数和完成条件相同。

共享 `src/ui/arcade/assistant` 只根据当前 stage、首个错误和 hint 次数选择固定台词，不假装理解自由文本。教程约 20 秒，提供一张与正式事件不同的练习卡让学生完成“选卡→放槽→检查”；一般教程反馈不计时、不计分、不发 objective facts。主学习关卡的检查才产生计分事实；教程结束返回准备确认，学生显式开始后才启动练习或比赛 session。随时可看操作说明，连对效果只产生装饰火花，不加分。

## 状态机与接口

本地阶段：`briefing → tutorial → timeline → timeline-feedback → needs(0..2) → needs-feedback → future → result`。错误反馈是对应阶段的子状态，关闭反馈回到同一草稿；正确反馈只由主动 `continue` 推进。公共 timeout 可从任意比赛阶段进入只读 result，未完成项写“未完成”；不能自动补齐未来卡。

```ts
type HistoryLabProfile = 'guided' | 'standard';
type HistoryLabMode = 'practice' | 'contest';
type HistoryLabStage = 'briefing' | 'tutorial' | 'timeline' | 'needs' | 'future' | 'result';
interface HistoryLabConfig {
  readonly mode: HistoryLabMode;
  readonly profile: HistoryLabProfile;
  readonly challengeCode: string;
  readonly contentVersion: string;
}
interface HistoryObjectiveFact {
  readonly objectiveId: string;
  readonly revision: number;
  readonly verdict: 'correct' | 'incorrect';
  readonly usedHint: boolean;
}
interface HistoryLabTransition {
  readonly state: HistoryLabState;
  readonly facts: readonly HistoryObjectiveFact[];
}
createHistoryLabState(config: HistoryLabConfig, content: HistoryLabContent): HistoryLabState;
reduceHistoryLab(state: HistoryLabState, action: HistoryLabAction, content: HistoryLabContent): HistoryLabTransition;
```

`HistoryLabState` 只包含 config、stage、feedback、timelineOrder、needsRoundIndex、slotsByObjective、futureChoiceId/claimSlots/reason、revisionByObjective、lastCheckedRevision、completedObjectiveIds、hintedObjectiveIds。所有完成状态由有效确认派生，不再保存另一份总分或“知识掌握”。`HistoryLabAction` 是 `start/tutorial-complete`、`move-event {cardId,toIndex}`、`place-module {objectiveId,slotId,moduleId}`、`select-energy-plan {planId}`、`choose-future {choiceId}`、`place-claim {slotId,cardId}`、`edit-reason {value}`、`check`、`hint`、`continue`、`finish {reason:'completed'|'timeout'|'abandoned'|'interrupted'}`、`reset-practice`。正式 finish/status 名称统一为这四个值。

- 只有有效实质草稿编辑递增该 objective revision；未知 ID、同位置移动、重复不变的检查和 incomplete 检查不递增 revision、不发 fact。session.record 内部绑定 runId/seq，草稿 revision 不能充当全局序号。
- 错误 `check` 产出 incorrect fact；成功第一次产出 correct fact。同一 objective 在比赛和练习的当前 run 中完成后均锁定；只能回看反馈，不能单项撤回确认或删除共享事实。
- 未完成的未来草稿修改能力选择时清空对应情境/条件槽与检查反馈；四种选择的合法关系都同等接受。完成后的槽卡只读。未来自由理由不改变关系、不产生 fact；当前结果屏显示最后原始理由，理由只属于内存 outcome，不写共同分数历史，下一轮或刷新清空。
- `reset-practice` 重置的是整轮：若旧练习 session 仍 running，先 `session.finish('abandoned')`；先调用 `session.start(practice config)`，仅返回ok才用 `createHistoryLabState` 重建全部目标/草稿/理由；失败保留上一轮只读成果并显示原因，不显示假running新局。已结束的旧 session 不重复 finish。不提供单目标 uncompletion API，练习 `score/elapsedMs` 始终为 null。
- result不接受玩法输入；主关卡守卫active+session running。hidden只禁用输入且比赛时钟继续；新页导航/pagehide由专用bootstrap结束正式run，返回ready。纯reducer不读时间/DOM/storage。

## 锁定的权重、计分与公共运行合同

五个 objective 权重：`history-event-order` 400；三个 `history-*` 需求各 100；`history-future-choice` 300，总计 1000。这些数是内容权重，不是每项最终分。只对主关卡有效检查发事实，不对阅读、拖动次数、文本、教程或动画得分。

共享 `src/shared/arcade/scoring.ts` 使用唯一公式：`score = floor(.7 * earnedWeight) + floor(.2 * firstCorrectWeight) + (completed ? floor(100 * clamp((360000 - elapsedMs) / 180000, 0, 1)) : 0)`。`earnedWeight` 是最终正确完成的目标权重，纠错仍可获得完整 70% 贡献；每项第一次有效检查决定首次正确资格，首次错误或首次正确前使用显式提示均不进入 `firstCorrectWeight`。常驻操作说明不是提示。连对只有装饰火花，不加分；完成前没有速度奖励。全部首次正确且180秒内完成为1000分，300秒完成为933分；400权重的时间轨道先错后纠正且180秒内全完成为920分。

上述公式只用于正式比赛；练习结果的 `score` 与 `elapsedMs` 均为 `null`，不能把0分或0ms伪装成练习成绩，练习不进入比较记录。

`HistoryObjectiveFact` 保持 `{objectiveId,revision,verdict,usedHint}`；`session.record(facts)` 的公共适配器内部绑定 runId/seq 并去重，页面不设置运行事件 ID。提示使用保留在该 objective 的 `usedHint` 中，修复后正确 fact 仍带该值。不把 nickname、reason 或字数传入计分器。

运行与比较使用 `src/shared/arcade/{types,session,scoring,storage,challenge-code}.ts`，界面使用 `src/ui/arcade/{shell,results,assistant,styles}`。`challenge-code` 决定稳定卡序，比较键精确为 `activityId + challengeCode + profile + contentVersion + scoringVersion + durationMs`。本页 `activityId` 为 `history-lab`。每个控制器由共享 factory 创建一个页面拥有的 session，调用 `session.start(config)`、`session.record(facts)`、`session.finish(reason)`、`session.subscribe(listener)`、`session.setActive(active)`、`session.dispose()`；共享拥有时钟、去重和一次性 finalize，没有全局 singleton 或第二份 store。

教程结束后显示显式“开始练习/开始正式挑战”，点击后专用bootstrap才调用session.start，subscribe驱动共同游戏shell。浏览器hidden继续单调时钟；真实新页导航/pagehide/刷新结束正式run为interrupted/unranked，BFCache退出也执行，pageshow返回ready、不恢复正式状态。练习草稿只在当前document内存在；结果屏显示真实部分成果与本机历史，理由仅内存。共同游戏导航使用真实href，不保留mounted run跨文档。

## 文件与任务

新增文件均在`src/activities/history-lab/`：`source.ts`只读事实、`content.ts`定义槽位/合法关系/档位、`state.ts`唯一reducer、`graphics.ts`轨道/场景几何、`view.ts`稳定DOM、`controller.ts`接线、`styles.css`局部布局、`index.ts`导出view/mount、`main.ts`调用独立bootstrap。入口为`games/history/index.html`。公共UI只消费，不复制；旧src/chapters的修改/删除只由集成负责人按公共UI6A执行，纯数据仍保留供source引用。

### H1：只读内容适配与版本化操作内容

**Files:** Create source/content，`tests/unit/history-lab/content.test.ts`。

**Interfaces:** `getHistorySource()`返回现有historyLearningContent及展品只读引用；`historyLabContent:HistoryLabContent`定义稳定objective/slot/module/claim IDs；排序/Unicode纯规则由本页rules/state拥有，不依赖待删旧reducer。

- [ ] 写`source_references_existing_facts_without_mutation`、`five_event_ids_and_order_are_preserved`、`energy_plans_are_complete`；断言14展品、五主题/五事件、五objective权重和1000，未来四组合法关系齐全。
- [ ] 运行`npm run test:unit -- tests/unit/history-lab/content.test.ts`确认RED。
- [ ] 实现adapter及操作内容；旧纯内容只读，文案不复制；旧学习专属逻辑在UI6A撤出。
- [ ] 重跑本测试及既有history单元，记录GREEN；具备Git授权时独立保存。

### H2：五节时间轨道及插入顺移

**Files:** Create state/graphics/view的timeline部分；Test `tests/unit/history-lab/state.test.ts`、`tests/e2e/history-lab-ui.spec.ts`。

**Interfaces:** 生产上文createHistoryLabState/reduceHistoryLab；动作move/check/hint/continue映射公共选择/拖动。槽位0..4，非法位置/重复卡为no-op。

- [ ] RED：正确排列在check前不完成；check只发一次history-event-order事实，主动continue才到需求；第一对倒置可定位且不重置其余卡；错误/成功前后revision正确。
- [ ] 实现唯一领域排列和插入顺移；选中/拖放预览不计分；成功后只读，可回看但不再次计分。
- [ ] 跑`npm run test:unit -- tests/unit/history-lab/state.test.ts`；build后跑timeline UI路线，确认鼠标/键盘/合成touch等效、竖轨可用、取消无残留，焦点不丢失。
- [ ] 看初始/选择/倒置/修好四态截图；不符合规范第7节则修正后保存。

### H3：三幅需求装配与未来说明卡

**Files:** Complete content/state/graphics/view；Test content/state及UI E2E。

**Interfaces:** 沿用上文三条能源plan ID/三槽，未来四组claim关系；五objective为history-event-order400、三需求各100、history-future-choice300。

- [ ] RED：三需求完整正确关系才发correct，空槽facts=[]，功能错误为incorrect，正确槽保留；三种能源链均成立，换路线不增加目标数；未来关系四种均合法，空理由也成功。
- [ ] RED：0/120/121 Unicode字、emoji、空白、HTML字串、IME组合；超限保留并可不附理由完成，不按关键词/观点加分。
- [ ] 实现需求物体/路径与未来句子，反馈锚定错槽；只更新改变部分。教程/资料/常驻帮助不发facts，明确答案提示保留usedHint。
- [ ] 跑全部history-lab单元和UI E2E；每条合法能源关系都有可见因果，最终卡展示实际选择而非通用奖状；保存。

### H4：独立页、公共session、UI验收与旧功能保留

**Files:** Complete controller/styles/index/main及独立HTML；`tests/e2e/history-lab-competition.spec.ts`，维护指南追加新页说明。

**Interfaces:** view:string/mount(host):ChapterController；公共session为每页实例，record返回true才提交候选state（空facts也守卫）。教程后显式start。

- [ ] RED：同码/档位/假时间同分；首次错/答案提示影响首次贡献，重复/动画不加分；record拒绝不改state。
- [ ] 实现公共UI的真实结果/未保存/中断状态；hidden继续正式预算，去其他HTML/pagehide/BFCache中断，返回准备页，旧历史状态不被游戏reset操作。
- [ ] 跑`npm run test:unit -- tests/unit/history-lab tests/unit/arcade`、build、history新E2E和既有history-domain/history-learning；按UI6A将旧学习覆盖迁到新页，另加旧入口撤出及14展品保留断言。重练start失败保留旧成果的单元/浏览器用例通过。无Three/GLB请求。
- [ ] 按公共UI计划UI4/UI7尺寸/输入/评分门槛交付；截图有乱序、单卡纠错、三需求和未来卡。记录儿童适龄/3–6分钟尚未实测。

## 交付边界

旧主题/任务已由新游戏承接后撤出，历史14展品/档案/年份定位保留；新游戏与旧展厅是独立文档，同一文档只挂载本游戏一次。新页面完成后的视觉、布局和纠错以Impeccable规范为准；本文件保留科学规则，不以测试通过代替真实操作和截图。当前所有任务待实施，计划未产生实际得分或UI审核分数。
