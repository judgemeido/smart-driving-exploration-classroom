# 05 汽车设计工坊与 06 道路验证实验室 Implementation Plan

> **For agentic workers:** 使用分工明确的多agent实施；全部GPT-6.1 Sol。可用时采用superpowers:subagent-driven-development，否则按本计划接口所有权、测试先行和独立审阅执行，不伪称调用缺失技能。复选框只在实际实现与验证后更新。本轮仅写计划，待用户审阅后实施。

**Goal:** 补齐05提出方案、06验证比较的独立页面，让学生完成一次有证据的设计改进，而非只选择配置后看固定动画。

**Architecture:** 设计草稿/不可变版本、纯事件仿真、只读帧播放、学习档案各自分离。05/06使用同一项目repository；新增道路presenter，不扩张现有E2两帧逻辑，也不让Three计算判分。只在单一新存储键写完整档案，保留旧v1记录。

**Tech Stack:** 现有TypeScript、Vite、Three.js、原生DOM/CSS、Vitest、Playwright；不新增后端或渲染引擎。

**Spec:** [05/06设计说明](../specs/2026-11-09-design-simulator-05-06-design.md)。下文决定实施接口，设计说明决定页面内容与教学边界。

## Global Constraints

- 每人电脑，教师先讲后独立操作；无实体、倒计时、排行榜或联网控班。活动不要求01–04全部完成。
- 现有浅色主题、正文/按钮≥18px、辅助≥16px、目标≥44px；1280×720、1366×768、390宽与200%重排可用。只展开当前一步，主操作和版本始终可发现。
- 05四步：读任务→设备来源→连接与规则→保存版本；06：预测→测试→查证据→只改一项→同条件复测→解释。
- 主配置只用camera/radar/lidar三类信息源；四用途与三能源为不参与判定的选做属性，无100点预算、无四套CAD、无续航/效率/真实性能排名。
- 事件判定优先级：占用 > 红灯 > 必要信息未知 > clear。决策只读观测，世界真值不可泄漏；缺规则命令null、断执行执行null，不默认通行或默认安全停车。
- A/B为通行任务；C为给定安全停靠条件下的停车并提示任务。安全处理与任务完成分别显示；任何结论只适用当前教学事件集。
- 运行产生不可变记录；播放只消费记录；草稿和新版不修改旧测试。公平比较必须场景完整快照、seed、模型与评价版本一致。
- 新键`science-learning:classroom:v2`；原`science-learning:portfolio:v1`、`science-learning:knowledge:v1`与旧arcade键保留。损坏/未来记录不能被空档案覆盖，存储失败可继续内存操作并导出。
- 04保留当前legacy入口；新05/06使用主学习入口。两份未提交2026-11-08课堂草案不改不提交。

## Review Focus

- 路由引用旧版本/非法引用/前后退：不能偷偷换最新方案（任务1、3、4）。
- 输入未知但仍可产生停车命令：3D不得擅自断掉计算；有命令且执行断开也不得显示已停车（任务2、4）。
- 运行中改草稿/换区/隐藏：旧测试仍绑定开始时配置，播放不补跑或重复入档（任务2、4）。
- 多项修改、换天气或换模型版本：不能显示“只改一项”或把差异归因于方案（任务2、5）。
- 导入旧格式、坏文件、配额失败及过期预览：不得部分替换档案、丢失新版本或覆盖旧存储（任务1、5）。

## 文件与所有权

```text
src/learning/studio/
  types.ts / catalog.ts / validation.ts     共同合同、设备与规则目录、校验
  revisions.ts / repository.ts / archive.ts 不可变版本与整包存储、校验/交换
  design.ts / design-view.ts / design.css   05四步编辑与版本摘要
  scenarios.ts / evidence.ts / engine.ts   独立观测、事件与纯判定
  comparison.ts                            配置差异及可比性
  simulator.ts / simulator-view.ts          06运行、证据、回放、往返05
  simulator.css / playback.ts               06布局与帧播放
  road-stage.ts                            三维道路与同状态DOM备用
  report.ts / print.css                     方案/测试/比较/知识交流报告
src/learning/main.ts / routes.ts            单owner集成入口和路由
src/learning/knowledge.ts                   注入共同repository保留首答模型
src/learning/records.ts                     复用既有活动v1校验，不改变旧格式
src/learning/stage.ts                       按需提取车辆几何共享工厂，不复制controller
tests/unit/learning/studio/*.test.ts
tests/e2e/studio-design.spec.ts
tests/e2e/studio-simulator.spec.ts
tests/e2e/studio-archive.spec.ts
docs/engineering/studio-{sources,guide,verification}.md
```

合同/存储/入口由集成人先完成。随后05 owner、仿真owner、道路表现owner可并行；模型与数据合同冻结后再接线。集成人串行负责build、浏览器服务、全量检查与Git。所有agent均为6.1 Sol。

## 共同接口

定义于studio/types.ts，内部草稿UI状态可另定义，不混入试验配置。

```ts
type SourceId = 'camera'|'radar'|'lidar';
type Condition = 'occupied'|'red-light'|'uncertain'|'clear';
type Action = 'wait'|'stop-alert'|'cautious-go';
type LinkId = 'sensor-compute'|'compute-actuator';
interface DesignConfig {
  use: 'suv'|'sedan'|'school-bus'|'delivery';
  energy: 'electric'|'hybrid'|'hydrogen';
  sources: SourceId[]; links: LinkId[];
  rules: {condition:Condition; action:Action}[];
}
interface DesignDraft {name:string; config:DesignConfig; rationale:string; expectation:string}
interface DesignRef {designId:string; revision:number}
interface DesignRevision extends DesignRef {schemaVersion:1; snapshot:DesignDraft}
interface EvidenceField {
  source:SourceId; field:'occupancy'|'signal';
  status:'available'|'weakened'|'unknown';
  value:'occupied'|'clear'|'red'|'green'|null; reason:string;
}
interface TeachingScenario {
  id:'A'|'B'|'C'|'transfer-rain'; version:1;
  goal:'pass'|'stop-alert'; weather:'clear'|'rain'|'fog';
  events:{id:string; truth:{occupied:boolean;signal:'red'|'green'|null};
    required:('occupancy'|'signal')[]; evidence:EvidenceField[]}[];
}
interface TrialFrame {
  eventId:string; observations:EvidenceField[]; condition:Condition;
  commanded:Action|null; executed:Action|null; reasons:string[];
}
interface StudioTrial {
  id:string; design:DesignRevision; scenario:TeachingScenario;
  seed:'studio-fixed-1'; modelVersion:'studio-events-1'; evaluationVersion:'studio-eval-1';
  prediction:string; frames:TrialFrame[]; safetyVerified:boolean; taskCompleted:boolean;
}
```

设备数组/连接/规则在提交前规范化排序，拒绝重复及未知ID。用途/能源与名称不参与引擎；rationale/expectation不按关键词判分。

`StudioRepository`由repository.ts导出：`getDraft/setDraft`、`saveRevision(draft,designId?):DesignRevision`、`getRevisions/getRevision(ref)`、`addTrial/getTrials`、`addComparison/getComparisons`、`getPortfolio/setPortfolio`、`getKnowledge/setKnowledge`、`getSaveStatus`、`exportArchive`、`previewImport/applyImport`。读写均复制；公用实例只由main创建注入。`mountDesign(host,{repository,navigate,source?:DesignRef})`、`mountSimulator(host,{repository,navigate,reference:DesignRef|null,referenceError?:string})`均返回`{setActive(boolean),dispose()}`。

档案结构`{schemaVersion:2,portfolio:Portfolio,knowledge:KnowledgeData,studio:{schemaVersion:1,draft:DesignDraft,revisions:DesignRevision[],trials:StudioTrial[],comparisons:ComparisonRecord[]}}`。单次序列化写入v2。首版容量：设计版本≤100、测试≤200、比较≤100、整包≤4MiB；达到数量上限阻止新增并提示导出，不静默删除baseline。草稿名0–20个Unicode字符，rationale/expectation/prediction/解释≤500；有限数字、已知ID、引用完整性必须验证。内部ID使用UUID；不以客户端时间作为科学判定条件。

路由从当前字符串union扩成兼容union：现ActivityId/traffic/report/Q1/Q2原值保留，新增`{kind:'design';source:DesignRef|null;error?:string}`、`{kind:'simulator';reference:DesignRef|null;error?:string}`。`parseRoute/routeHash`在routes.ts仍为唯一映射；main改用格式化hash比较路由，防止对象引用导致重复挂载。

### 任务1：设计版本、路由与共同档案

**Files:** studio/types/catalog/validation/revisions/repository/archive.ts；routes.ts/main.ts/knowledge.ts的注入适配；unit studio/{design,repository,routes,archive}.test.ts。

**Interfaces:** 生产上述共同合同与repository。main先恢复repository再挂载；knowledge可接受repository数据接口，不能继续独立写旧key。

- [ ] 写失败测试：至少一条规则；重复条件/设备/链接拒绝；无设备或缺部分规则合法但警告；V1不可被草稿或返回值修改；同designId提交递增V2；准确revision可取；未知引用不回退。
- [ ] 写失败路由测试：`#design`、`#design?designId=x&revision=1`、`#simulator?designId=x&revision=1`、`#workbench`；缺字段、重复参数、负数/0/小数/不安全整数、坏编码都留在对应页面error；既有所有路由解析不变。
- [ ] 写失败存储测试：无v2时只读接入两v1；之后只写v2；v2损坏/未来不退回旧值后覆盖；读取/写入异常仍保留内存；版本和测试输入深拷贝；引用不存在不能入档。
- [ ] 运行`npm run test:unit -- tests/unit/learning/studio/design.test.ts tests/unit/learning/studio/repository.test.ts tests/unit/learning/studio/routes.test.ts tests/unit/learning/studio/archive.test.ts`，确认RED。
- [ ] 实现校验/版本/单键存储/路由适配；保留旧keys和旧活动格式。暂不发布空页面导航。
- [ ] 同命令GREEN，运行`npm run build`，提交`feat: add immutable studio designs and shared archive`。

### 任务2：三个场景、纯事件引擎与受控比较

**Files:** studio/{scenarios,evidence,engine,comparison}.ts；unit studio/{engine,comparison}.test.ts。

**Interfaces:** `evaluateDesign(design:DesignRevision,scenario:TeachingScenario):Omit<StudioTrial,'id'|'prediction'>`；`compareTrials(a,b):{comparable:boolean;reason?:string;changes:ConfigChange[];singleVariable:boolean;eventDifferences:EventDifference[]}`。比较字段为每个设备成员、每个连接成员、每个condition的action、用途、能源；名称/解释不算实质配置变化，新增/删除规则算一项。

- [ ] 写测试固定A的占用→清空；B红灯→绿灯仍占用→绿灯清空；C持续关键证据未知；迁移雨例观测可用。灯色只能来自camera；radar/lidar只提供教学推导的占用信息。仅选距离设备时B最后仍不能确认灯色许可。
- [ ] 固定观测筛选/合并：只消费已选设备字段；同字段只要有available停止证据就保留，不能被另一路clear覆盖；无停止证据时，每项required至少有一个available且值符合许可才为clear。weakened/unknown不投票，不把设备数量当真实性认证。测试“已知占用+另一设备清空”“红灯+占用未知”“无灯色但距离清晰”三组反例。
- [ ] 写真值隔离测试：保持observations不变、改truth，判定不变；缺输入变unknown但可由不确定规则生成停车命令；断执行null；已知占用/红灯优先于其他未知；重复条件直接拒绝运行。
- [ ] 写评价表测试：A/B一直wait安全处理可成立但任务false；clear通行才完成；C必须stop-alert，wait只有安全无任务；已知停止原因/unknown下通行不成立；command/execution null不成立。相同完整输入结果相同。
- [ ] 写比较测试：同场景同版本可比，规则wait→go为单变量；设备+规则两项不标单变量；天气/事件/seed/模型/评价不同不直接比较；相同配置诚实显示未改变；草稿变动不重算旧测试。
- [ ] 运行`npm run test:unit -- tests/unit/learning/studio/engine.test.ts tests/unit/learning/studio/comparison.test.ts`确认RED，实现后GREEN。由另一6.1 Sol核查事件表/解释，提交`feat: evaluate studio scenarios from observable evidence`。

### 任务3：05四步设计与版本卡

**Files:** studio/{design,design-view,design.css}.ts/css；e2e/studio-design.spec.ts。

**Interfaces:** 消费任务1repository，车辆表现复用现有stage的只读SceneSnapshot适配；设备安装标记独立工厂，后续与06共用。`source`引用准确旧版本并复制成新草稿，不修改引用版本。

- [ ] 写浏览器用例先验证缺页面：默认校园纯电用途；推荐守候方案/空白；设备选择与安装位同步；端口点击/列表同样连通；规则冲突定位；缺设备/规则给说明但至少一合法规则可保存。
- [ ] 实现四步，只显示当前工具；返回上一步不清空；用途/能源折叠且说明不影响当前测试；设备显示观测类型与局限，无伪真量程。
- [ ] 实现保存V1与摘要、存储状态；创建旧版副本后保存V2并能返回V1。按钮名称“保存方案版本”“用此版本验证”，不称已提交老师。
- [ ] `npm run build`后`npm run test:e2e -- tests/e2e/studio-design.spec.ts`；检查1280/1366/390、键盘/IME、超长名称/HTML文本、刷新恢复与未保存提醒。通过后提交`feat: build the guided vehicle design workshop`。

### 任务4：06单场景闭环、道路模型与证据播放

**Files:** studio/{simulator,simulator-view,simulator.css,playback,road-stage}.ts/css；unit studio/playback.test.ts；e2e/studio-simulator.spec.ts。

**Interfaces:** `createRoadStage(host):{setFrame(frame:TrialFrame,scenario:TeachingScenario):void;setActive(boolean):void;dispose():void}`；`createPlayback(frames,onFrame):{play,pause,seek(index),setActive,dispose}`，播放不调用evaluateDesign。道路位置从event映射，观测/命令/执行来自同TrialFrame。

- [ ] 先写闭环浏览器测试：V1守候→A安全但未完成→复制至05仅改clear规则→V2→A完成→比较两次仅一规则变化；旧测试和版本不变。先以此RED建立集成门槛。
- [ ] 先做A：固定准确引用、预测、显式运行一次入档、三栏证据、为什么未完成、复制本版修改并保存往返上下文。缺引用给版本选择/示例；坏引用不给运行按钮，不取最新。
- [ ] 新道路沙盘有校门、行人/占用区、停止观察位置、车道与灯。先按event变化，再增加显式慢放；车只在executed允许时表现相应通行/等待/提示；未定义动作停播放并说明，不能伪造真实安全停车。
- [ ] 加B/C及雨迁移例。未知输入的停车命令仍显示；断执行无实际动作反馈；开壳/分层只影响看法不改结果。遮挡不能让设备看到后方世界标签。
- [ ] 单测播放暂停/seek/重播不新增记录；隐藏恢复不补时间；dispose停止回调。浏览器测快速换路一canvas、contextlost同状态备用仍可运行、reduced-motion逐步等效、录制过程中草稿修改不污染。
- [ ] 运行`npm run test:unit -- tests/unit/learning/studio/playback.test.ts`、build与`npm run test:e2e -- tests/e2e/studio-simulator.spec.ts`。实际查看A故障/修复、B三事件、C未知与窄屏，再提交`feat: validate saved designs in the road laboratory`。

### 任务5：比较解释、学习档案和完整交换文件

**Files:** studio/{report,print.css,archive}.ts/css，main.ts报告挂载适配；unit studio/archive.test.ts；e2e/studio-archive.spec.ts。

**Interfaces:** `ComparisonRecord={id:string;leftTrialId:string;rightTrialId:string;explanation:string}`；保存时两test必须存在；报告只消费快照。`previewImport(text):{token:string;summary:ImportSummary;scope:'all'|'portfolio-only'}|{error:string}`；`applyImport(token):{applied:boolean;persisted:boolean;issue?:string}`，token绑定已验证候选和当前repository修订号，过期拒绝，不信任UI复传对象。

- [ ] 先写测试：全包恢复原7活动、Q1/Q2首答/修正、版本、测试和比较；只有portfolio旧文件仅替换活动，保留其余；引用缺失/重复ID/未来版本/坏枚举/超限/NaN拒绝；取消与过期预览不改变当前；保存失败仍可导出全部内存且提示未持久化。
- [ ] 实现06并排比较：显示同条件依据、实际差异、逐事件处理与两个独立结果标签；多项变化提示不可单独归因；不同条件仅分别阅读。解释不按关键词打分。
- [ ] 扩展#report分区“探索记录/知识交流/方案版本/验证与改进”，空状态给具体入口，不伪造已完成；完整JSON、兼容旧活动JSON、中文打印。主学习记录导出统一全包；竞答原单轮导出继续可用并标范围。
- [ ] build后运行`npm run test:e2e -- tests/e2e/studio-archive.spec.ts`，实际查看两版本、不同场景不可比、空档案、损坏数据、打印页、存储失败导出，通过后提交`feat: compare designs and preserve complete classroom evidence`。

### 任务6：发布01–06导航与整体验收

**Files:** main.ts/routes.ts/catalog.ts、PRODUCT.md/DESIGN.md与studio三文档；现有测试仅在行为确实改变时适配。

**Interfaces:** 单owner注册05/06及workbench别名；06→05带source准确版本，05保存后→06准确新版本，同条件复测上下文独立保存而不是从“当前场景”猜测。

- [ ] 将05/06加入顶部正式导航；04保留legacy。手机/200%导航可换行，不压缩正文；“我的学习记录”不占06编号。所有链接直接访问/刷新/前后退能恢复正确对象。
- [ ] 全量运行`npm run test:unit`、`npm run build`、`npm run test:e2e`；不把旧274/26当新版检查结果，不归档仍适用的旧回归。
- [ ] 6.1 Sol独立审核全部Review Focus；修复重要问题并加回归。查看实际渲染：05四步、06A/B/C、故障/未知、前后比较、学习报告、contextlost备用、390与1280/1366宽。
- [ ] 记录实际draw calls/静止无持续绘制、低配模式和资源释放；教室设备未获得时明确未验证，不编GPU性能。教师/儿童试讲未做则列为交付后的教学验收。
- [ ] 更新用户说明与科学来源、实测命令和结果；`git diff --check`；提交`feat: publish the complete design and validation learning flow`。

## 用户可审阅的首个成果

优先交付可玩的05→06A→修改→复测→比较闭环。确认模型、控件与证据真正对应后，沿同合同完成B/C、迁移和报告，不批量复制空页面。最终交付的是两页和一条完整学习链；教学有效性以真实试讲记录为准。
