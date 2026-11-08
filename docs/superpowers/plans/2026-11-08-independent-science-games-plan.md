# 01–03 独立科普游戏页面改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. root只负责核心方案、接口与验收；产品实现由GPT-6.1-sol完成。本轮交付Plan，不开始产品代码。

**Goal:** 将01主题卡、02结构挑战、03传感器实验室改为三款有独立HTML入口的二维科学游戏，学生点击顶部导航按钮后跳转到新页面操作。

**Architecture:** Vite多页面构建：原主站保留四个展厅；三个游戏有各自HTML/main入口。纯导航元数据与共同游戏能力复用，页面运行实例互相独立。游戏知识、规则、画面与存储分离。

**Tech Stack:** 现有TypeScript/Vite，HTML/CSS、SVG为主，局部Canvas；Vitest与Playwright。暂不增加Phaser、UI框架、后端或在线AI依赖。

**Spec:** [Impeccable 二维体验设计规范](../specs/2026-11-08-science-activities-impeccable-design.md)与[UI 实施计划](2026-11-08-science-activities-impeccable-ui-plan.md)是本轮新增视觉与交互依据。本文件保留独立HTML和公共合同；三个详细子计划保留领域规则。新活动承接旧01–03学习，重复旧面板按UI6A迁移清理。

**2026-11-08 最终范围修订：** 用户随后确认“旧的内容确实可以删除”。本轮仅重做未来活动Plan，不动产品代码；未来实现删除由新页承接的重复学习UI/专属状态，保留原展品与基础互动及04。旧知识不丢失，纯数据被新页引用时保留；测试按迁移前后行为分别验收，不为清空测试而删覆盖。

## Global Constraints

- 面向三至六年级；每人一台电脑，本地记录，同题挑战码与真实成绩卡供现场比较。
- 三个按钮分别跳转三个独立HTML页面，当前标签页导航，不在原展厅内嵌游戏、弹窗或同时显示两个工作台。
- 原主站四章仍为01–04，基础展品和原hash导航保留；重复学习按UI6A撤出，菜单追加01–03独立活动链接。新游戏页使用共同导航，主站不进行手风琴改版。
- 正式局360000ms；练习不限时；默认时长和档位需真实儿童试玩验证。
- UI正文/按钮至少18px、辅助信息至少16px、操作目标至少44×44px；拖动有点击/键盘等效操作，布局、状态、动效按Impeccable设计规范执行。
- root不接管游戏产品实现；共享文件由一位6.1-sol集成智能体负责，三个游戏可并行实现。

## Review Focus

- 点击游戏入口确实发生文档导航；独立刷新成功；原3D资源不进入游戏依赖（任务A、E）。
- 重复提交、空槽、提示后纠错、输入法不能导致刷分或丢失有效操作（任务B、D）。
- 浏览器隐藏继续正式计时；跳到另一HTML/退出/刷新终止本局；回退不恢复正式局（任务B、E）。
- 本地存储不可用/损坏/第二标签页出现时仍可玩，不自动中断另一窗口，不假称已保存（任务B、E）。
- 显示的图示关系、距离刻度和判分来自同一状态；旧展厅原交互仍可使用（任务D、E）。

## 1. 页面和导航

以下为站点根路径示例；部署在子目录时统一通过BASE_URL生成链接，不能散落硬编码。

| 所属展厅 | 原展厅链接 | 新增活动链接 |
| --- | --- | --- |
| 01 发展历史 | `index.html#history`：发展历史 | `games/history/index.html`：进化修复站 |
| 02 结构展厅 | `index.html#explore`：拆解与交互 | `games/structure/index.html`：系统维修台 |
| 03 激光雷达 | `index.html#lidar`：感知原理互动展 | `games/sensor/index.html`：回波侦探 |
| 04 安全上路 | `index.html#traffic`：道路规则体验 | 无新增游戏 |

原主站在现有菜单末尾追加“科学活动”一组真实链接，不给已占满的页头再挤入三个按钮；现有四章按钮、菜单入口与hash行为保留。新游戏页的共同导航按四组展示展厅/活动链接，使用原生details或按钮控制折叠，当前组展开、当前项高亮；Tab/Enter/Escape与焦点可见。总展厅数仍显示04。所有链接统一用BASE_URL生成。

每个游戏HTML只加载本游戏入口、共同导航、共同UI及规则/记录服务。不得调用原主站bootstrap，也不得把三个游戏view同时插入原index.html后隐藏切换。各游戏含自己的开始、教程、完整操作台、反馈、结算与“返回展厅”。旧01主题/任务、02的13项挑战、03 guide/world/distance/weather学习入口/面板/专属逻辑在新页承接并验证后撤出；02复习和分组归位保留。原纯数据通过source adapter作为单一事实源，不能清理仍被新页/保留功能使用的文件。

## 2. 三款游戏

| 游戏 | 操作循环 | 必须可见的反馈 | 保留的科普内容 |
| --- | --- | --- | --- |
| 01 进化修复站 | 排回五节历史时间轨道 → 在工厂/补能/道路场景组装需求与技术关系 → 拼未来汽车的用途/能力/条件说明卡 | 事件车沿修好轨道运行；正确连通后显示生产/能量/信息流；错项局部修正 | 五主题卡、历史顺序、需求驱动与多种技术并存；开放理由不评优劣 |
| 02 系统维修台 | 在动力/支撑/感知三张二维剖面中补装部件 → 连接带方向和语义的功能关系 → 试运行 | 电机/齿轮转动、悬架活动、轮胎接触路面、传感器证据进入分析区；错件错线可单独替换 | 原13个主题全部映射；辨认部件与解释配合；毫米波等图示不冒充真实模型节点 |
| 03 回波侦探 | 转发射器并接收回波 → 扫描形成轮廓并移动距离尺 → 雨雾中配合传感器证据与观察行动 | 发射/回波路径、距离/往返光程、扫描轮廓、天气导致的证据缺失可见 | 光程与距离、点组成轮廓、不同传感器作用与局限；六张设备卡进入资料抽屉 |

每页两至三个核心机制；关卡循环统一为“短目标→操作对象→试运行→看到原因→修正→主动继续”。成功由排列、装配、连线或测量状态决定；点击一个选项后直接显示对错不算完成游戏化。失败保留正确部分，提示下一步可修正动作。

guided（引导，建议三四年级）与standard（标准，建议五六年级）保留同一科学事实，改变提示密度、干扰项和已公布的输入容差，分别比较。教程在正式计时外；练习不限时。初步目标为每款约3–6分钟，需试玩调整。

详细方案：[01](2026-11-08-science-arcade-01-history.md)、[02](2026-11-08-science-arcade-02-structure.md)、[03](2026-11-08-science-arcade-03-sensor.md)。它们负责具体内容ID、游戏reducer、图形对象和关卡验收，本文件控制接入与共同边界。

## 3. 高品质二维UI方向

采用Impeccable“明亮科学操作桌”：纸白/浅蓝背景、深蓝文字、钴蓝主操作、青绿成功、橙黄能量；图形采用准确几何SVG。具体token、字阶、触点、操作状态和反例以设计规范第3–6节为准，不再靠“高品质/有趣”形容词验收。

桌面工作区约72%舞台/28%短证据，顶部一句目标、下方当步工具与唯一主操作；1366×768首屏目标/主体/工具/主操作均可见。平板证据区下移；手机01竖轨、02子系统放大、03场地/标尺分层，不能等比缩放。320px宽、200%缩放、触屏取消和软件键盘均须实际验收。

落位、连通、回波、纠错和完成才触发重点动效；声音默认关闭且可主动开启。脚本角色称“提示助手”，根据本局状态给短反馈；可做徽章和连对动画，但不伪称真实AI或生成虚构同学成绩。减少动画模式保留静态因果反馈。

先按UI计划UI1–UI3做03“发射→错接Tx→换Rx→收到回波”的真实可玩片段；鼠标/键盘/触屏和减少动画路线验证后才铺开三页。每页目标audit≥17/20且各维≥3、critique≥34/40，无未解决P0/P1；这都是后续验收门槛，当前没有实现或评分。

## 4. 采用的GitHub SKILL

本轮已安装并读取[Impeccable](https://github.com/pbakaus/impeccable) 4.8.1，用shape/operate/layout/adapt/animate/audit重新制定二维UI计划；来源及引擎不可用事实见设计规范。保留以下早期参考，Game Studio技能尚未安装。SKILL是开发指引，不是给儿童展示的产品依赖；UI不添加在线AI调用。

| 技能与固定GitHub来源 | 本方案中的用途 |
| --- | --- |
| [frontend-design](https://github.com/anthropics/skills/blob/2c5958ecac7cee2b583967a2c4981d0f4a75c579/skills/frontend-design/SKILL.md) | 原创视觉语言、排版、配色、构图与完成度 |
| [web-game-foundations](https://github.com/openai/plugins/blob/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/game-studio/skills/web-game-foundations/SKILL.md) | 玩家动作、规则/渲染分离、输入映射、保存与生命周期边界 |
| [game-ui-frontend](https://github.com/openai/plugins/blob/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/game-studio/skills/game-ui-frontend/SKILL.md) | 游戏舞台、HUD、工具托盘、开始/结算与有意义的动效 |
| [game-playtest](https://github.com/openai/plugins/blob/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/game-studio/skills/game-playtest/SKILL.md) | 真实操作、错误修复、截图观察、浏览器交互验收 |
| [phaser-2d-game](https://github.com/openai/plugins/blob/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/game-studio/skills/phaser-2d-game/SKILL.md)（备选） | 仅在连续角色移动/大量精灵/碰撞玩法证明需要引擎时启用 |

本期选DOM/SVG＋局部Canvas，是针对摆放、连线、测量和可访问性作出的项目选择；覆盖Game Studio对一般2D游戏的Phaser默认，不把此选择冒充技能原文。完整来源、许可证核验与选型依据在[技能附录](../../engineering/2026-11-08-science-arcade-skills.md)。

## 5. 本地比赛与生命周期

每款满分1000：完成贡献最多700，首次正确最多200，全部完成后的时间奖励最多100；纠错仍得完成贡献，提示前后分项可解释。权重E/F分别为完成/无答案提示且首次确认正确的权重，总权重1000：`floor(.7*E)+floor(.2*F)+(全部完成?floor(100*clamp((360000-t)/180000,0,1)):0)`。练习score/elapsedMs为null。详见[计分附录](../../engineering/2026-11-08-science-arcade-scoring.md)。

各电脑输入同一挑战码，同游戏/档位/内容版本/评分版本/时长才可比。展示实际成绩、分项、挑战码与用时，存本机历史，现场人工核对；不做自动班级联网榜。首次正式尝试保留，重新练习不覆盖正式成绩；老师换轮次码再赛。没有真实学业评价或防作弊认证承诺。

**本版独立HTML会发生文档离开：** 同一游戏页面内隐藏浏览器/暂停动效，正式计时继续；点击导航去展厅/其他游戏、刷新或pagehide（含BFCache）时，该局记interrupted且不作为有效竞赛成绩。界面在开始前说明“离开游戏页面会结束本次挑战”。回退/重新访问进入准备页，不恢复正式局；已完成成绩已存本地。旧四展厅自身hash导航仍保留原语义。

localStorage键仍为`science-arcade:local:v1`，同origin可共享三个游戏的本机历史。不同电脑不同步；不同浏览器/主机/端口隔离。保存失败仍展示当前成绩并标未保存。新文档启动只报告已有activeDraft，不自动杀掉另一标签页；明确点击“结束未完成挑战”才按expectedRunId处理。删除只作用本键。

## 6. 核心技术合同与目录

```text
index.html                         原四展厅
games/{history,structure,sensor}/index.html  三个独立HTML
src/app/navigation-items.ts        纯导航元数据，四组七个链接
src/ui/chapter-navigation.ts       共同手风琴，仅操作导航
src/activities/bootstrap.ts        独立游戏装配与page生命周期
src/activities/{history-lab,structure-lab,sensor-lab}/
  main.ts / index.ts / source.ts / view.ts / graphics.ts / controller.ts / state.ts / content.ts / styles.css
src/shared/arcade/                 types/session/scoring/storage/challenge-code
src/ui/arcade/                     shell/results/assistant/styles
src/chapters/*/learning-data.ts    既有科学事实真源，新增source.ts只读引用，不搬迁
```

`src/app/chapters.ts`仍只注册旧四个展厅及其runtime。`navigation-items.ts`只含number/title/label/相对href，不导入任意controller/view。`vite.config.ts`配置四个HTML构建入口；所有游戏HTML从自己的main启动，不调用旧app/bootstrap。共享bundle可以复用，但没有跨文档运行实例共享。

新游戏链接不用原主站的`data-go`路由事件标记；采用真实href和独立导航选择器，旧click代理不得preventDefault后把它回退到history。验收必须断言pathname和文档入口已改变，不能仅看到按钮高亮就算跳页成功。

`src/activities/bootstrap.ts`导出`bootstrapActivity(root:HTMLElement,definition:ActivityDefinition):{dispose():void}`；ActivityDefinition包含`activityId,title,galleryHref,view,mount`。它装配本游戏独立host和共同导航、处理pagehide/visibilitychange/pageshow；BFCache恢复把中断局呈现为准备/中断说明，不能复活run。游戏继续导出`view:string`和`mount(host:HTMLElement):ChapterController`，接口`setActive(boolean)/dispose()`保持。业务activityId仍为history-lab/structure-lab/sensor-lab，**不作为路由**。

公共types固定如下；计分附录直接引用，子页不得另定义不兼容版本：

```ts
type ActivityId = 'history-lab'|'structure-lab'|'sensor-lab';
type Profile = 'guided'|'standard';
type FinishReason = 'completed'|'timeout'|'abandoned'|'interrupted';
interface DomainFact { objectiveId:string; revision:number; verdict:'correct'|'incorrect'; usedHint:boolean }
interface ObjectiveProgress { id:string; weight:number; completed:boolean; firstCorrect:boolean; usedHint:boolean }
interface ArcadeRunConfig {
  activityId:ActivityId; mode:'practice'|'contest'; profile:Profile;
  challengeCode:string; contentVersion:string; scoringVersion:string;
  durationMs:360000|null; slotId:string; nickname:string;
  objectives:readonly {id:string;weight:number}[];
}
interface ArcadeScore { progress:number; quality:number; efficiency:number; total:number }
interface ArcadeResult {
  runId:string; config:ArcadeRunConfig; status:FinishReason; eligible:boolean;
  elapsedMs:number|null; objectives:readonly ObjectiveProgress[];
  score:ArcadeScore|null; createdEpochMs:number;
}
interface ArcadeSnapshot {
  phase:'idle'|'running'|'finished'; runId:string|null; config:ArcadeRunConfig|null;
  elapsedMs:number|null; remainingMs:number|null; objectives:readonly ObjectiveProgress[];
  result:ArcadeResult|null; persistence:'saved'|'memory-only'|'read-only';
}
type StartResult = {ok:true;runId:string}|{ok:false;reason:'invalid-config'|'already-running'|'attempt-used'|'other-run-active'|'capacity-full'};
interface ArcadeSession {
  start(config:ArcadeRunConfig):StartResult; record(facts:readonly DomainFact[]):boolean;
  finish(reason:FinishReason):ArcadeResult|null;
  subscribe(listener:(snapshot:ArcadeSnapshot)=>void):()=>void;
  setActive(active:boolean):void; dispose():void;
}
```

factory `createArcadeSession({clock?,repository?})`在本游戏mount创建；默认performance.now。reducer先算候选transition，record检查时间/active/阶段并绑定runId/seq，返回true才提交候选state；空facts也经过守卫。首次subscribe立即通知，之后microtask通知，避免最后一项成功回调抢在领域state之前。revision随实质编辑递增，同草稿不重复评分；未填完整不算错误。全部目标完成自动完成，恰好时间到优先timeout；终局幂等。当前run完成项只读，重练先结束旧练习再start新run。

初版contentVersion=`science-arcade-content-1`、scoringVersion=`science-arcade-score-1`；compare key使用有序元组activityId/challengeCode/profile/contentVersion/scoringVersion/durationMs。挑战码如`SA1-R07-7K2M4C-G`，G/S表示档位；32字符表`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`；确定性子种子由`${seed}:${activityId}`的FNV-1a32初始化Mulberry32，黄金样例测试固定。`createComparisonKey(config)`、`parseChallengeCode(text)`、`calculateArcadeScore(objectives,elapsedMs,durationMs)`归共享模块。

repository拥有read/begin/checkpoint/save/updatePreferences/createPlayerSlot/deleteResult/clearRecords/reset/subscribe/dispose；activeDraft保存config/目标摘要/elapsed/runId/slotId/key/日期，恢复清理只能显式核对expectedRunId。声音默认false，昵称只作文本，01自由理由只在内存展示。结果/偏好字段及校验按计分附录。

## 7. 6.1-sol执行工作包

| 顺序 | 负责人 | 范围与交付 |
| --- | --- | --- |
| A | 集成智能体 | Vite多HTML入口、纯导航元数据、新页导航、独立bootstrap、主站仅追加入口 |
| B | 集成智能体 | session/计分/本地记录/挑战码/结果UI；接口先冻结 |
| C | UI/03智能体 | 执行Impeccable UI1–UI3：共用控件/输入、03错误修正片段与视觉门槛 |
| D1/D2/D3 | 01/02/03三个智能体并行 | 各自完整玩法、教学数据与纯规则、页面/测试；详见三个子计划 |
| E | 集成＋审查 | UI6A重复旧学习撤出、基础展品回归、UI7截图/试玩/审核 |

root控制范围、共享接口和阶段验收。公共文件仅集成者写；每页只写分配目录和对应内容/测试。每个可验收工作包分别Git保存；暂存/提交串行执行，不能把其他智能体未完成工作带入提交。

## 8. 实施步骤及验收

- [ ] A0：读当前工作区和Git差异，先保存已授权现有工作；保留用户文件删除/修改，不回退。运行一次基线`npm run check`并记录真实结果。
- [ ] A：写入口/导航验收：原站追加三活动链接各跳对应pathname，刷新各游戏200响应，原四hash及旧菜单正确、子目录base正确；Vite多页面构建后再接入口，不替换现有导航。游戏根不存在旧model-canvas/其他游戏host，网络与bundle无旧Three/GLB/DAE。
- [ ] B：先写并跑失败测试，再实现共同合同。验证分数1000/950/910/500、提示和重复提交、360000ms边界、record拒绝时domain不前进；跨文档中断、后台继续、回退不恢复；存储禁用/损坏/未来schema/双标签/首局锁/30天200条与只清本键。运行`npm run test:unit -- tests/unit/arcade`及build。
- [ ] C：先执行Impeccable UI1/UI2共同骨架与输入，再做UI3错误修正小样。首屏空间、触屏取消、键盘等效、静态因果反馈均通过；对象不可辨或只有对错toast即返工，不把静态稿冒充可玩游戏。
- [ ] D：各6.1-sol按子计划实现并跑自己的unit/E2E。01保留五主题与未来说明；02覆盖13项安装及3关系图；03覆盖六目标、原理资料与同坐标测量。使用真实鼠标/键盘/触屏路径，不在E2E直接灌答案state。
- [ ] E：执行UI6A迁移清单：撤出重复旧学习入口/UI/专属逻辑，旧学习测试的知识/纠错断言移到新页，另加旧入口不存在与基础展品保留回归。游戏跳原展厅、游戏互跳、刷新/前进后退按独立HTML语义，正式局离页只有interrupted记录。
- [ ] E：两独立浏览器context同码同动作/假时间同结果、本地数据不互传；每游戏截图初始/错误/成功/结算，03另验天气/米尺。独立6.1-sol审查代码与game-playtest实际试玩；修复按所有权回派。
- [ ] E：执行Impeccable UI7视觉与输入矩阵、detector/audit/critique，修正后polish；最终`npm run check`记录真实测试数与退出码。交付三个地址、审核分项、截图、维护说明和限制；儿童可用性/六分钟预算列为待课堂验证。Git保存按实施时授权执行，不推送/发布。

当前为规划交付：已研究技能并由6.1-sol准备子计划；以上产品实现、测试和试玩均未执行。
