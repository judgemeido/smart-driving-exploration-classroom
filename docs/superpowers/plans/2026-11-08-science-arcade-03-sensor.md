# 03 回波侦探 · Impeccable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans task-by-task. 本轮仅重做计划，未实施。03首个错误修正可玩片段是UI前置门槛，不代表当前已经制作。

**Goal:** 用方向、接收、扫描、移动距离尺和双证据连接，让学生从真实操作结果理解感知原理与局限。

**Architecture:** `/games/sensor/index.html`独立HTML/main/bootstrap；旧`/index.html#lidar`保留基础八部件/四步/模式/5–80m/扫描；guide/world/distance/weather由新页承接后撤出。新source只读现有纯内容和measurement函数，不修改旧数据/导出，不加载旧3D控制器。

**Tech Stack:** TypeScript、Vite、DOM/CSS、几何SVG、Vitest、Playwright，不加框架/3D/在线AI。

**Spec:** [Impeccable 二维设计规范](../specs/2026-11-08-science-activities-impeccable-design.md)和[UI实施计划](2026-11-08-science-activities-impeccable-ui-plan.md)为构图和输入反馈依据；[集成总计划](2026-11-08-independent-science-games-plan.md)与[计分附录](../../engineering/2026-11-08-science-arcade-scoring.md)为公共合同。

## Global Constraints

- 原八部件/四步/模式/5–80m/扫描/模型降级保留；后来新增学习状态/面板在新页知识验收后按UI6A迁出并清理。
- 新页三个顺序实验、六目标；练习不限时、正式360000ms，目标180000ms只用于既有评分规则；适龄/时长待儿童验证。
- 教学reflectivePoint为图示、光程、距离、纳秒、nearest判定的唯一米制依据；图标外壳不产生另一答案。
- 光程动画已放慢；轮廓/天气样点是教学示意，不是准确率、AI置信度、真实性能或安全认证。
- 鼠标/键盘/触屏相同容差、样点、目标与分数；18px正文、16px辅助、44px目标；资料有可访问DOM。
- 默认练习，教程后显式开始才session.start；后台继续正式预算，离页/刷新/pagehide含BFCache中断，返回准备页。
- 六张传感器卡、四步解释和20/60m例沿用原科学事实；新练习提示可改操作句，不复制一份科学正文。

## Review Focus

- 输入位置经inverse CTM转换；不同分辨率/缩放/帧率对应同一米制证据（S1/S3）。
- 首发不评价未解锁接收；空连接/不完整扫描不消耗首次验证资格，接错后可只改一根线（S2/S3）。
- 重复角度/双击/动画回调不刷证据，跨槽扫描按经过角度而非事件密度采样（S1/S2）。
- 天气的未确认不等于没有目标，传感器配合不能推广为总是可靠（S2/S4）。
- 旧基础实验不受游戏reset、后台、超时或存储影响；重复新学习撤出（S4）。

## 来源和稳定接口

新增`source.ts`从旧`learning-data.ts`、`measurement.ts`只读引用纯文案与函数；旧光速299792458m/s和roundTripNanoseconds保持，不在游戏另造常数。旧learning-world依赖Three，不引用；新几何与天气采样自有scenario/snapshot。

`createSensorScenario({seed,profile,contentVersion}):SensorScenario`、`createSensorState(scenario):SensorState`、`reduceSensorLab(state,action,scenario):SensorTransition`、`getSensorSnapshot(state,scenario):SensorSnapshot`固定。Transition={state,facts}，facts使用公共DomainFact。controller先算候选，record返回true才提交（空facts也守卫），subscribe microtask通知；不在UI另算分。

## 玩法与一局流程

推荐名称“回波侦探”。准备页显示档位/练习正式/挑战码/六目标；独立页内部含工作台、米制舞台和证据板，各实验主动继续不自动跳关。正式种子只来自挑战码。开始前说明“暂停或后台时倒计时继续；跳转其他页面、刷新会中断本次正式挑战，返回不能恢复”。

### 玩法一：把光送出去，再接回来

孩子旋转发射方向，并按“发射一次”。每个目标有标为“教学反射点”的固定米制标记，教学光束是带宽度的方向区域，包含该点时产生回波；不把图标的外壳当成另一个测距边界。屏幕依次展示设备到该点的发射路径、部分反射、返回设备的回波，不画成所有光都原路返回的镜面反射规律。命中解锁接收目标；孩子将接收器接线头连接到 Rx 插口，再发射一次来接住回波。Tx/Rx 有图形与中文标签，“选中线头→选插口→连接”是拖动的等效操作。

第一目标 `pulse-hit`：首个目标被实际射线命中。第二目标 `echo-received`：第一目标完成后，首次有效接收测试在命中目标且接收器正确接入 Rx 时完成。第二目标未解锁时的第一发射不评价接收首次表现；避免初次教学动作直接罚孩子。没有接线的接收提交是不完整，不记首次；接错 Tx 后发射属于有效错误，有因果反馈。“脉冲没碰到目标”“回波到了设备，但接收器接错插口”分别指出可修正动作。

每次命中从同一教学反射点坐标求 `d`，显示单程 `d m`、往返 `2d m`、`roundTripNanoseconds(d).toFixed(1) ns`，动画旁写“光程动画已放慢”。guided只要求比较远近，standard可展开“往返要除以二”的数轴，均不强制纳秒心算。

### 玩法二：扫描点组成轮廓，再标记最近距离

俯视场景有三个相同大小的参考目标图标，其教学反射点坐标由种子确定，轮廓开始隐藏。孩子转扫描方向旋钮、逐次采样或拖动扫过一段方向；固定角度槽位每个只记录一次，包含反射点的各次教学光束获得同一目标的方向证据，逐步补出轮廓示意。图注写“轮廓为教学示意”；装饰轮廓没有独立测距和评分边界。重复扫同一槽位仍显示回波动画，但不增添新证据。按“确认轮廓”时，三个目标每个都至少两槽才发outline-evidence的correct事实；只出现一条回波或任一目标不足两槽始终facts=[]，没有一条回波就算incorrect的分支，不把早看进度算错答。

然后点选一个已测目标，把米制标记尺移到该目标距离，按“确认最近目标”。`nearest-mark` 要求选择实际最近目标且标尺误差处于档位容差内。舞台地图有距离刻度，测量证据板始终显示已经得到的距离，孩子通过读证据、比较和移动标尺解决，不能靠物体画得更大来判断。反馈示例：“你标在 12m，最近目标回波是 8m，把标尺向设备移 4m。”

### 玩法三：天气改变证据，传感器一起工作

测试道固定有近处路障与远处移动目标。guided是雨，standard是雾；天气是本轮条件，正式挑战中不能切换成晴天降低难度。练习可切换并比较。每目标六个预定教学样点：雨保留四个并添加三个固定干扰点；雾近目标保留四个、远目标保留两个并添加两个干扰点。种子决定被保留的样点ID和干扰位置；这些整数及装饰点云是教学参数，不是设备在现实天气下的准确率，目标的测距和纳秒仍统一对应教学反射点。

孩子把激光雷达、毫米波雷达、摄像头中的两个接线头插入证据板的两个槽，观察不同信息叠加。此场景配置：激光雷达提供近路障的距离证据，毫米波雷达提供远目标距离/相对运动证据，摄像头在本轮提供不足以解决两项任务的图像。sensor-evidence要求接入激光雷达+毫米波雷达并确认两条目标证据；两个槽均接入不同传感器后“核对证据”才是有效提交，摄像头组合属于有效错误，少一根或空连接只呈现不完整状态且facts=[]。未供信息标“未确认”，不能标“没有目标”。场景只说明此条件下的配合，不推广成任何天气固定优劣。

最后孩子操作测试车的“继续/慢行/停下”档位杆，并打开提示灯，按“应用观察方案”。本轮封闭测试道的 8m 处有路障，4m 处标出游戏观察线；`risk-response` 要求停在观察线并提示，明确文字“这是游戏观察位置，不是现实制动距离”。错误继续时只演示计划路径进入未允许区域，不制造碰撞恐吓；反馈“前方路障已确认，先在观察线停下并提示”。若证据尚不足，继续同样不给通行结论。六目标完成后给分项卡和一条引用本局证据的观察总结。

### 难度、舞台和输入

guided发射角步长4°、教学光束半角6°、距离尺步长1m、标尺容差±1m；standard发射角步长2°、教学光束半角4°、距离尺步长0.5m、容差±0.5m。光束角是游戏输入容差，不是真实设备参数。扫描采样角固定-40°到+40°、每4°一个槽，两档相同；输入从一槽跳到另一槽时消费经过的每个槽，键盘和触屏得到相同采样，不按采样事件密度给分。standard有更多待核对点和较少默认说明展开；固定六目标和同档位共同标准不变。

常驻操作引导不影响首次验证分；主动答案提示通过公共assistant明确说明“此目标仍可获得探索分，首次验证分不再获得”，先锁定该目标domain state的usedHint，后续合法评分事实携带true；提示动作本身不发评分事实。提示、纠正都不扣探索完成分。公共assistant仅根据本局状态给确定性短反馈，不调用在线AI、不评分孩子的自由文本。连胜动画仅为装饰。

舞台几何使用viewBox，物理坐标独立以米存储；桌面构图按Impeccable第4/9节，不用固定1200×720整幅等比压缩；手机按区域纵向排列，不缩小整个页面到不可点击。核心操作目标至少44×44px，正文和按钮至少18px、辅助标签至少16px，焦点可见。舞台线条、路径方向、插口和有效/待核对证据有文字与形状提示，颜色不是唯一含义。用原生范围输入/button/fieldset，键盘左右调方向/尺、Enter/Space发射与提交；连线通过选择按钮完成。SVG为图示，证据同时有可访问DOM列表；aria-live=polite只播报提交结论与阶段变化，不逐帧播回波。减少动画仍有静态等价结果。

同一练习局已完成目标只读，不撤销或再计一次；仅修正未完成草稿。“再练一遍”若session仍running先finish('abandoned')，再session.start(newPracticeConfig)，仅start返回ok才重建domain state；已终局则直接start。新runId、提示锁、revision与样点集合重建，不提供retraction API。

## 文件与任务

新增`src/activities/sensor-lab/{source,types,content,scenario,measurement,state,graphics,view,controller,index,main}.ts`和`styles.css`，入口`games/sensor/index.html`。source只读原内容；scenario为米制/天气真值；measurement为纯几何/角度采样；state为唯一领域进度；graphics只画snapshot；view为可访问DOM；controller持公共session。旧chapters/lidar的重复学习撤出由集成负责人按UI6A实施，基础实验与被source引用的纯数据/measurement依赖保留。

snapshot至少含stage/ray、measuredTargets[{id,reflectivePoint,distanceMeters,roundTripNanoseconds,uniqueSampleIds}]、weatherEvidence[{targetId,visibleSampleIds,noiseSampleIds,confirmedFields}]、feedback。六目标pulse-hit150、echo-received100、outline-evidence150、nearest-mark200、sensor-evidence200、risk-response200，总权重1000。版本初值沿用总计划。

### S1：只读科学来源与可解的米制场景

**Files:** source/types/content/scenario/measurement；Test `tests/unit/sensor-lab/{source,scenario,measurement}.test.ts`。

**Interfaces:** 上述scenario接口，`getDistanceMeters(point):number`、`hitReflectiveMarker(origin,directionDegrees,target,halfAngleDegrees):RayHit|null`、`getScanSlotsBetween(previousDegrees,nextDegrees):readonly number[]`。RayHit含反射点、单程米数与同距离纳秒。

- [ ] RED：引用旧事实/光速不修改；seed7K2M4C目标距离8/16/28m、bearing -20/0/20°，同seed一致，各模板无重叠/平距并列/不可解，近目标8m不变，初版只置换名称和bearing配对。
- [ ] RED：16m→往返32m/106.7ns，30m200.1ns、60m400.3ns；负值拒绝；装饰外壳大小不改测量。guided±1m边界通过、1.01失败；standard±0.5m通过、0.51失败。
- [ ] 跑本目录单元确认RED，实现来源adapter和纯几何；不能为了提取共享物理函数修改旧文件。
- [ ] 跑本目录和旧lidar measurement/content测试，缺docs JSON仍运行；记录GREEN。

### S2：三个实验与六目标的真实因果

**Files:** state；Test `tests/unit/sensor-lab/{state,evidence}.test.ts`。

**Interfaces:** 上述create/reduce/snapshot；动作与UI无关，时间/总分/存储由session拥有。

- [ ] RED：首发只评命中；接收解锁前不评接收；空连接facts=[]、Tx有效错误/Rx有效成功；同revision/重复动作不发事实；答案提示usedHint保留。
- [ ] RED：21扫描槽逐格和跨槽结果相同；三个目标每个两样本才可完成轮廓；一点或缺目标facts=[]。最近选择+尺共同判断，错后可修正。
- [ ] RED：雨/雾样点与干扰ID确定；双证据缺槽facts=[]、满槽错误组合incorrect、激光+毫米波在本情境覆盖两项。观察线停车+提示正确，其余行动不通过；不虚构碰撞过程。
- [ ] 跑单元RED→实现→GREEN；无DOM/Three/帧时序依赖，六目标完成自动结束由session处理，阶段反馈主动继续；record拒绝时领域候选不提交。

### S3：先可玩片段，再完整平面实验台

**Files:** graphics/view/controller/styles/index/main/HTML；`tests/e2e/sensor-lab-ui.spec.ts`。

**Interfaces:** view:string/mount(host):ChapterController；公共UI1/UI2、公共session、S2 snapshot。

- [ ] 先执行UI计划UI3：发射→错接Tx→原位断点反馈→换Rx成功；真实鼠标/全键盘/合成touch及reduced-motion均通过，再扩完整扫描/尺/天气。
- [ ] RED：SVG滚动/缩放后同指针对应同目标；取消拖线/失焦无残留；同档位输入序列facts一致。nearest错误差值与显示读数来自同一snapshot。
- [ ] 实现场地为主体、发射/接收口有中文及方向、三距离和尺同屏；天气两种证据/未确认/干扰同时有文字和形状，主操作唯一；手机场地与控制器结构重排。
- [ ] build后跑本UI E2E，所有操作使用真实控制器，不灌答案state；视口截图与触屏手势分别留证；按UI6/UI7尺寸/状态实看截图和响应数据。

### S4：正式挑战、结果与原LiDAR全部保留

**Files:** controller公共服务集成、`tests/e2e/sensor-lab-competition.spec.ts`，开发指南追加新页来源/规则说明。

**Interfaces:** 沿用session/start/record/finish/subscribe/setActive/dispose；仅score模块拥有700/200/100，本页不另存累计分。

- [ ] RED：两隔离context同码同动作/假时间同结果，记录不互传；错/提示后修正、重复不加分；正式首局锁不能刷新绕过，练习score/elapsedMs=null。
- [ ] RED：后台到360s超时、180s离页interrupted且score=null，刷新/回退/BFCache回准备页；双标签开B不杀A、expectedRunId显式处理；存储禁用/损坏/配额失败仍可读结果。
- [ ] 实现真实证据总结和保存状态；练习重开先结束running旧局再start新run。原LiDAR基础输入/实验保留；guide/world/distance/weather入口、UI、专属state/world/camera在UI6A撤挂，纯文案/米制数据依赖仍被source消费时保留。
- [ ] 跑sensor/arcade单元、build、新sensor E2E与全部既有lidar/learning-route回归；对应旧学习知识/输入覆盖转到新页，并另验旧面板不存在和基础八部件/四步/模式/滑杆/扫描/降级仍工作。新页缺WebGL/DAE/GLB仍完整，无Three网络请求。
- [ ] 按UI7记录初始、错接、收回波、扫描、尺、天气、成功、超时/中断和未保存；不把计划中的参数称为已验证真实设备性能或适龄。

## 范围外与交付

不加在线AI、自动班级榜、摄像头采集、真实传感器接口、制动模拟、地形编辑器、3D复刻或新题卡测验。重复旧LiDAR学习UI/专属状态按UI6A清理，基础实验保留，新页科学事实通过保留的纯数据只读引用。UI有可见因果反馈、真实输入完整路线和可追溯审核证据才交付；当前尚未实施/评分。
