# 01–03 独立二维活动实施与验收

计划：[UI实施计划](../superpowers/plans/2026-11-08-science-activities-impeccable-ui-plan.md)。2026-11-08至09日实施；本文区分实际测量与尚未完成的现场验证。

## 交付范围

| 页面 | 实现 |
| --- | --- |
| `/games/history/index.html` · 进化修复站 | 五事件插入重排；工厂/能源/道路因果装配；未来能力、帮助对象和条件说明卡；三能源路线等价接受 |
| `/games/structure/index.html` · 系统维修台 | 动力/支撑/感知三台；13部件主题；4/4/6条有向语义关系；湿路观察、错边删除与局部修复 |
| `/games/sensor/index.html` · 回波侦探 | 命中后接收；Tx错误/Rx修正；21方向槽扫描；米制测量；天气双证据和停下/提示灯方案 |

共用准备、真实不计分接线演练、练习/正式挑战、计时、暂停、帮助、记录与结算。练习优先，正式设置折叠；通关成果默认展开，挑战码/版本说明后置。正式六分钟、暂停和后台继续计时，离页中断；结果不虚构保存状态。开放理由仅留页内存。

正常实现及独立审核由GPT-6.1 Sol并行，root统一集成、build/E2E和Git。Luna轻文档任务连续两次服务端404未启动，root接手；不将派发视为完成。两份smart-driving课堂草案未纳入本轮。

## 验证命令与结果

| 检查 | 结果 | 实际范围 |
| --- | --- | --- |
| 开工基线 | 191单元、69浏览器通过；构建退出0 | 实施前记录，非本轮完成数字 |
| 新活动专项浏览器 | 52/52通过，42.2s，退出0 | arcade-layout/ui、history-lab-ui、structure-lab、sensor-lab-ui |
| 最终全套检查 | 246单元/50文件、生产构建、95浏览器通过；退出0 | 箭头修正后重新运行`npm run check`；浏览器4.8m |
| 导航迁移回归 | 原两处回归已修正，全套通过 | 科学活动收进独立菜单，避免横向导航挡住旧模型弹窗关闭按钮 |

真实路线包括01三能源通关、键盘插入、鼠标拖动、IME组合、HTML字符和超限理由；02十三主题和三完整图、错槽/错边修复、Chrome合成触屏；03实际键盘扫描/距离/天气、普通触摸tap和pointercancel。共用覆盖教程焦点恢复、未开始不建正式局、后台计时、刷新/缓存退出、多标签恢复及禁用/损坏存储。规则单元另覆盖首次锁、满容量、30天边界、时钟回拨、配额与会话所有权。

## 视觉与交互证据

截图根：`.superpowers/sdd/2026-11-08-science-activities/screenshots/`，文件为本机验收证据，目录按项目现有规则忽略。`{history,structure,sensor}-{width}.png/json`为六档截图和控制几何读数；root已打开桌面、手机及03错误接线/扫描/天气截图人工核对。

| 条件 | 结果与限制 |
| --- | --- |
| 1440×900、1366×768 | 三页无横向溢出，主要操作在初始工作视口内 |
| 1024×768、768×1024 | 三页无横向溢出，独立重排布局 |
| 390×844、320×568 | 无横向溢出；03方向聚焦时目标、滑杆和发射同屏；02手机保留独立放大剖面和实际SVG箭头 |
| 02手机三系统 | 320/340/390逐台安装/连线，实际SVG路径数4/4/6；横线箭头按实际卡片边界修正，端点及其前7px转为屏幕坐标检查不落在任何卡片内；截图已复制为`structure-{width}-{power,support,perception}-{install,links}.png` |
| 键盘焦点 | 独立B在三页两手机宽度各50次真实Tab，视口和中心hit-test无覆盖；02专用回归允许1 CSS px子像素边界差，不放宽遮挡断言 |
| 200% | 先前CSS zoom=2模拟未溢出；尚无原生浏览器200%操作证据，不作为等价通过 |
| 输入设备 | Chrome实际鼠标/键盘事件与合成触摸；尚无实体手机和软件键盘实测 |
| 辅助技术 | 标签、原生控件、状态播报、非颜色反馈、焦点、reduced-motion覆盖；尚无NVDA/VoiceOver实测 |

已修正独立审核发现的问题：01暂停后主按钮恢复；02手机sticky遮焦点、隐藏连线、箭头被卡片遮住、关系词过多；03手机方向控件远离目标、普通tap被lostpointercapture取消；准备比赛说明密度、结果成果折叠；共用会话终局的多窗口所有权漏洞。

## 旧学习迁移与来源保留

| 原位置 | 撤出/删除 | 承接与保留 |
| --- | --- | --- |
| `history` | controller/view中的主题与任务入口，专属CSS；`learning-state.ts`、`learning-view.ts`及专属测试 | history-lab承接；14展品、档案、年份定位及`data.ts/learning-data.ts`保留 |
| `explore` | 十三挑战入口、输入/热点/控制分支；`learning-state.ts`、`renderExploreLearning`及专属测试 | structure-lab承接；原三任务、模型控制、动力故事、review/四步assembly、camera-observation与纯learning-data/targets保留 |
| `lidar` | guide/world/distance/weather入口与逐帧分支；`learning-camera.ts`、`learning-state.ts`、`learning-view.ts`、`learning-world.ts`、`weather-state.ts`及对应专属测试 | sensor-lab承接；八部件、四步骤、模式、5–80m、720点/暂停和模型降级保留；measurement/learning-data/learning-measurement保留 |
| `traffic` | 无 | 原八题与完整04学习保留；无04产品源码改动 |

新source只读导入保留的纯事实，不导入旧controller或Three。旧知识测试已迁为新活动完整操作与旧入口撤出/基础功能保留断言，未以空测试代替。维护文档已同步到当前架构与文件名。

## Impeccable与预算

Method: dual-agent (A: /root/impeccable_design_a · B: /root/final_audit_b)。使用已安装Impeccable v4.8.1与SHA校验的0.1.19引擎，两审查彼此隔离。首次A 30/40、B 15/20反映修复前问题；最终A为34/40，B为17/20，各项均至少3，无已验证残留P0/P1/P2。

| Nielsen设计启发式 | 分数/4 | 主要证据 |
| --- | ---: | --- |
| 系统状态 | 3 | 目标、阶段、完成数与操作反馈清楚；长手机页面顶端进度会滚出 |
| 现实语言 | 4 | 年份、能源转化、Tx/Rx中文、米制回波具有具体领域含义 |
| 控制与自由 | 3 | 取消、Escape、错边删除、显式继续；无通用undo，已确认目标锁定 |
| 一致性 | 4 | 共同导航、主次操作、物体→目标动作和原生控件 |
| 错误预防 | 3 | 命中才解锁接收，不完整证据不判错，关系选项按系统收敛 |
| 识别优于回忆 | 3 | 物体/年份/功能在场，能源4材料、未来对象3/条件2；手机长图仍需滚动 |
| 灵活与效率 | 3 | 点击、步进、原生范围和键盘均可操作；手机长板效率低于桌面 |
| 视觉简约 | 3 | 练习优先，正式与元数据折叠；手机头部与结果有少量重复 |
| 错误恢复 | 4 | 实测指出错槽、反向关系、Tx、距离与证据不足，保留正确部分 |
| 情境帮助 | 4 | 可直接进入真实不计分接线，科学资料与答案提示分开 |
| 合计 | 34/40 | Good；满足本轮已批准门槛 |

B五维为可达性3、性能4、主题3、响应式3、实现完整性4。设计特异性明确：时间车厢、功能剖面和米制光路来自具体任务；认知负担低到中等，主要来自任务本身。准备邀请动手，过程纠错温和，结尾显示真实作品。剩余两项P3：手机头部偏高；结果仍带完整禁用工具，今后可做专用只读证据布局。另有P3维护观察：活动CSS有重复色值，后续主题工作可收敛token。小屏初学者/低工作记忆用户仍可能较频繁滚动；无儿童实测，不能用专家判断代替。

Questions skipped: only 2 remaining priority issues, both P3.

最终双agent审核快照保存在本机`.impeccable/critique/2026-11-08T15-59-54Z__src-activities.md`，该目录按技能规则忽略，不随Git提交；本文保留主要结论。这是此目标首个持久快照，34/40；修复前30/40仅记录在本机审查历史，未伪造成持久趋势。

最终CLI `detect --json src/activities src/ui/arcade`退出0、结果`[]`。此前独立Chrome三页注入detect.js，console均无反模式；最终B直接复查当前页面，没有重复注入。原生browser inventory为空，无用户可见Human overlay；临时live-server已停止，未向项目HTML写注入标签。

| 页面 | JS gzip bytes | CSS gzip bytes | 初始响应合计gzip bytes |
| --- | ---: | ---: | ---: |
| 01 | 32230 | 5470 | 38127 |
| 02 | 29029 | 4388 | 33831 |
| 03 | 27720 | 5320 | 33448 |

独立B采集实际请求解码后重新gzip，非服务器transfer-encoding值；均低于120/35/300KiB预算，未发现Three/GLB/DAE请求。初始HTML文字实测最小5.78:1、控件≥44px；未覆盖所有后续SVG文字与半透明叠层。

性能环境：Windows / Ryzen 7 9700X / Chrome156 headless，无CPU限速。补测指定工作负载：03连续扫描5.598秒，179次真实键盘input、三角波21角度，DOM输出全部匹配且零连续no-op；input→DOM反馈后下一RAF p95为6.90ms，807帧间隔p95为7.10ms。02四个新局正确安装后试运行，共336个动画活跃帧，电机transform持续变化，帧间隔p95为7.10ms。满足所测桌面≤100ms输入反馈/≤33ms帧间隔预算；不是硬件input-to-photon或教学设备性能认证。早期静止页与达到上限的合成点击样本仅作探索，不作为指定负载证据。

本机完整原始记录：`final-critique-a.md`、`final-audit-b.md`、`final-audit-b-measurements.json`、`final-audit-b-keyboard.json`、`final-audit-b-contrast-input.json`、`final-audit-b-workloads.json`均在`.superpowers/sdd/2026-11-08-science-activities/`。审核浏览器已关闭。

适龄、预计3–6分钟、实体触屏、原生200%缩放、屏幕阅读器和真实儿童课堂效果未验证；自动化或专家评分不替代这些现场证据。
