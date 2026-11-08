# 01–03 科学游戏：本地竞赛与计分提案

状态：本轮仅方案，无产品实现。设计与公共契约见docs/superpowers/plans/2026-11-08-independent-science-games-plan.md及三个子计划，旧总计划/设计删除保持原样。新游戏是真实独立HTML页；默认档位与时长仍待真实儿童试用。

## 目的和授权边界

面向三至六年级，每名孩子使用自己的电脑。成绩用于比较一次科学游戏挑战的表现，不是考试成绩、真实车辆性能、真实 AI 置信度或个人学习能力评价。可采用教学模拟及确定性的游戏评分，结果必须能从实际操作和显示的证据解释。

用户这轮明确要求本地记录，**覆盖此前“无持久存储”的限制，仅适用于新增01–03游戏结果**。原展厅基础交互、3D雷达原八部件/四步/5–80m滑杆/模式/扫描及04原分数和重置保持；按2026-11-08最终授权，新游戏承接01主题/任务、02十三挑战、03新增学习后，撤出重复旧UI/专属状态；保留原基础展品、02复习/归位及04，范围见UI计划UI6A。旧答题日志不迁入新成绩。

`localStorage` 属于当前浏览器、设备和站点 origin（协议、主机、端口共同确定来源）。不同电脑不会自动共享数据；同一电脑从 `localhost:5173` 换到 `localhost:4173` 也会使用另一份存储。换浏览器、无痕窗口或清除站点数据可能看不到原记录。没有登录、后台服务、自动班级榜或网络传输。

## 可比较的同一场挑战

默认方式：老师公布同一个挑战码，所有孩子在各自电脑输入，完成后并排查看分数卡。本期不做打印、导出、跨活动总分、教师聚合、JSON导入、人工录分界面、班级排名或模拟的其他孩子成绩。

挑战码格式为 `SA1-R07-7K2M4C-G`：`SA1` 是码格式版本，`R07` 是老师自定义的本轮编号，六位不含易混淆字符的 Base32 值是场景种子，`G/S` 分别表示 `guided/standard` 档位。字符表固定为 `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`，输入去首尾空格、转大写，拒绝错误段数及未知版本，不静默换成随机场景。相同码与游戏包版本生成完全相同的目标、干扰项、天气、任务顺序和输入容差；动画帧率不影响答案。正式种子只能来自这个公布的挑战码，不能使用本机日期或时钟随机生成一个号称可比较的场景。

分数可比较的完整键：`{activityId,challengeCode,profile,contentVersion,scoringVersion,durationMs}`。activityId固定为 `history-lab|structure-lab|sensor-lab`，仅作业务身份，真实HTML路径按总计划生成；只有mode='contest'且eligible的实际结果用于比较。单独比较01、02或03，不合成跨游戏总分。不同档位、内容版本、评分版本、时长、练习与竞赛分组显示；版本变更保留旧结果的原标签，不重算成新规则。

两档为 `guided`（引导，建议三四年级）和 `standard`（标准，建议五六年级）。这是可自行选择的支持程度，不要求年龄、生日、学校或真实年级资料。两个档位有独立比较键。同一班统一档位、统一可用练习机会、统一提示规则及挑战时长；设备大小、鼠标、触屏和键盘不改变命中容差、题目数和评分权重。建议适龄范围仍待真实儿童试用。

## 练习、竞赛和重复挑战

练习不计时，可重试/提示/暂停/重开，仅显示目标与证据。正式开始前显示码/档位/版本/规则与预计3–6分钟，准备页不计时。durationMs=360000，targetMs=180000属于scoringVersion。明确说明“暂停或后台时倒计时继续；跳转其他页面、刷新会中断本次正式挑战，返回不能恢复”。

练习中已完成目标只读，仍可浏览证据，不能撤回或再计一次；仅修正未完成草稿。整局重玩若当前running，先session.finish('abandoned')，再session.start(newPracticeConfig)；已终局则直接start。只有start成功后重建全部domain state，创建新runId、提示锁与revision，不提供retraction API。

正式挑战在“开始挑战”时记录本地参赛锁。每个本地昵称槽位、每个比较键只有第一次正式尝试可以产生可比较成绩。正式完成和时间到均保留这个锁；重复点击开始、刷新或重开不能抹掉第一次表现。再次游玩显示“重玩练习”，不替换正式记录。新一轮由老师换 `Rxx`，所有孩子获得同样的新机会。昵称更改仍属于同一槽位；“换下一位玩家”才创建新槽位，不用姓名作身份键。

游戏按钮跳转到独立HTML文档，如/games/sensor/index.html；旧展厅/index.html#lidar。activityId='sensor-lab'只是业务ID，不是路由。真实页面导航、刷新或pagehide含BFCache中断当前正式局，返回游戏为ready且不恢复正式比赛；只有浏览器隐藏/动画暂停继续单调预算。bootstrap只检查报告activeDraft，不自动结束其他窗口。明确“结束未完成挑战”点击后recoverInterruptedArcadeDraft(repository,expectedRunId)核对最新ID并只生成一次interrupted记录，提示会结束对应其他窗口的局。ID不符不操作；退出记录不比较，老师换码组织新局。

## 显式计分公式

每游戏目标权重总和固定为 `W=1000`，权重不是可直接领取的分数。某目标首次完成只领取一次权重。目标可被纠正后完成，但第一次**有效的实质提交**是否正确单独锁定；不完整输入、未知 ID、重复 DOM 事件、动画结束事件都不构成新提交。每游戏明确哪些动作是实质提交，拖动过程及纯浏览不给分。目标首次完成前使用显式答案提示，会失去该目标的首次验证权重；常驻操作说明和档位默认引导不属于答案提示。

令 `E` 为已完成的唯一目标权重和，`F` 为首次实质提交就正确且完成前未用答案提示的目标权重和，`t` 为正式挑战耗时，`B=360000ms`、`T=180000ms`：

```text
探索完成分 P = floor(700 × E / 1000)
首次验证分 Q = floor(200 × F / 1000)
时间奖励   H = 全部目标完成
               ? floor(100 × clamp((B - t) / (B - T), 0, 1))
               : 0
游戏总分   S = P + Q + H，范围 0–1000
```

时间奖励最多占 10%，连胜只作装饰，不设置帧数积分或点击次数积分。孩子先看见因果反馈，再重试，仍能取得全部探索完成分；失败不随机扣分。`F` 按目标权重累加，不按重试次数处罚；重试不增加或减小其他目标分。提示前后都能获得该目标的探索完成分；成功后查看说明不追溯扣分。显示分项及“纠正后完成也能获得探索分”，不只给一个总数。

| 场景（B=360s，T=180s） | E | F | t | P/Q/H | 总分 |
| --- | ---: | ---: | ---: | --- | ---: |
| 全部首次正确，180s 完成 | 1000 | 1000 | 180s | 700/200/100 | 1000 |
| 全部首次正确，270s 完成 | 1000 | 1000 | 270s | 700/200/50 | 950 |
| 权重 200 的目标首次错误后纠正，270s 完成 | 1000 | 800 | 270s | 700/160/50 | 910 |
| 权重 200 的目标完成前看答案提示，再首次正确，270s 完成 | 1000 | 800 | 270s | 700/160/50 | 910 |
| 时间到，仅完成权重 600，其中首次正确 400 | 600 | 400 | 360s | 420/80/0 | 500 |
| 3 次同一成功事件、重复继续按钮 | 1000 | 800 | 270s | 仍为 700/160/50 | 910 |
| 手动结束、刷新或页面退出 | 任意 | 任意 | 任意 | 显示观察记录 | 无有效总分 |

终局reason与结果status统一为completed|timeout|abandoned|interrupted。timeout有效且显示“时间到，完成x/n”，completed为成功。本期只并排核对真实成绩卡，不创建排序榜或虚构同学。总分及各分项、原始耗时均展示，相同表现可标并列，不用昵称、保存时间或随机值制造差异。

## 事件归属、计时和冻结

游戏reducer产出领域事实 `DomainFact {objectiveId,revision,verdict:'correct'|'incorrect',usedHint:boolean}`，不自行产出分数。revision是该目标可编辑草稿的版本：真实编辑改变答案时递增，重复检查同一草稿不递增且不重复发事实；不完整输入、无效ID、纯浏览和重复无变化事件不发评分事实。显式答案提示只锁domain state中的提示标记，后续合法事实携带usedHint=true，不假造correct/incorrect事实。controller仅调用session.record(facts)，由session自身绑定当前runId和单调seq，检查目标ID、runId、seq及objectiveId+revision。共享session保留首次有效提交、完成目标和提示影响。后续正确可以完成目标，不能改变首次错误或提示影响；双击、长按、键盘合成点击及重复扫描不能重复领取。

record(facts):boolean是每个running玩法操作的提交门：controller先计算候选transition，调用record(candidate.facts)，只有true才提交candidate.state；false则保留原状态。空facts可用于纯编辑/提示/不完整输入的时间与active守卫，不代表得分。session通知在record返回后以microtask发送，避免最后目标自动结束时订阅回调抢先冻结候选状态；仅subscribe初次立即回调。controller须先准备初始state再订阅，不在回调中重入提交。

共享时钟提供 `nowMs(): number`，生产使用 `performance.now()`，测试使用可推进的单调假时钟。`elapsedMs=max(previousElapsedMs, nowMs()-startedAtMs)`，不使用动画 delta 累加，不用 `Date.now()`、设备时区或存档日期计算成绩。终止时先结算时钟再消费动作；恰好到 `B` 时，时间到优先于该时刻的新提交。完成时冻结真实 `elapsedMs`（限于 B），重复完成回调不再改变分数。

练习无预算，暂停冻结动画与操作。正式暂停/浏览器隐藏冻结动画和输入，单调预算继续；重新显示同一文档先结算时间。导航到另一HTML、刷新或pagehide含BFCache结束正式局为interrupted，返回页面ready，绝不追算跨加载时间或恢复正式局。旧3D controller不参与新时钟。

同一浏览器、同一origin通过repository尽力限制一个未终局正式挑战。切到另一活动后开始正式局，返回other-run-active并提供原局链接，不静默清除它。打开窗口B只报告A的activeDraft，绝不结束A；显式“结束未完成挑战”才按expectedRunId清理对应局。repository核对所有权，storage事件发现确实被其他窗口接管时原局中断。localStorage无原子事务，不保证恶意竞争安全；bootstrap只检查报告一次，不执行终局恢复。

## 本地数据契约

新增键science-arcade:local:v1，仅改本键。shared/arcade五文件和ui/arcade公共UI契约不变；每个游戏HTML有独立main/bootstrap/nav，导出view:string/mount(host):ChapterController供独立bootstrap调用，factory创建本页session，不挂载旧应用controller。同origin的不同HTML共享本机记录但不共享存活session；session仍提供start/record/finish/subscribe/setActive/dispose。

```ts
interface ArcadeLocalStoreV1 {
  schemaVersion: 1;
  dataVersion: 'science-arcade-1';
  revision: number;
  preferences: { slotId: string; nickname: string; profile: 'guided'|'standard';
    lastChallengeCode: string|null; soundEnabled: boolean }; // default false
  activeDraft: null | { runId: string; slotId: string; comparisonKey: string;
    config: ArcadeRunConfig; objectives: readonly ObjectiveProgress[];
    elapsedMs: number; startedEpochMs: number; savedEpochMs: number };
  contestLocks: { slotId: string; comparisonKey: string; runId: string; createdEpochMs: number }[];
  results: ArcadeResult[];
}
```

ArcadeRunConfig、ObjectiveProgress、ArcadeResult直接引用新独立游戏总计划公共types，不另建扁平结果类型。完整config含activityId/mode/profile/challengeCode/contentVersion/scoringVersion/durationMs/slotId/nickname/目标定义；draft只存正式局，slotId一致、key由config生成。完整进度/elapsed足以在显式清理时生成同runId的interrupted记录，score=null、eligible=false；savedEpochMs只作检查点日期，不恢复比赛计时。成功终局清同run draft，重复清理或ID变化不再写第二条。

新建匿名槽位默认昵称“实验员”；昵称可选，显示最多 12 个 Unicode 字符，输入去首尾空格、过滤控制字符，用 `textContent` 渲染，不允许富文本。提醒用代号，无姓名、头像、邮箱、身份证、位置、学生 ID 或第三方统计。`slotId/runId` 是设备内随机标识，不能解析出人身资料。结果保存昵称快照，改名不改历史署名。

repository.updatePreferences(partial)保存昵称/档位/挑战码/声音偏好，soundEnabled默认false。repository.createPlayerSlot(nickname?)供“换下一位玩家”创建新槽位，不以改昵称释放当前槽位的正式锁。01开放理由原文只在当前页内存展示，不写config、结果、草稿或preferences。

保存正式开始的完整config/目标摘要草稿与锁、终局结果和显式偏好；最多每5s检查点更新elapsedMs/objectives/savedEpochMs，不存帧、轨迹、按键原文、开放理由、截图或指纹。练习仅终局保存。成绩卡读当前内存校验结果，保存失败不会改变分数。

保留最近 30 天、最多 200 条终局记录和 200 条锁；开始页显示保留规则。先清除过期项，再按时间淘汰最旧记录，锁与对应正式记录一起保留。相同比较键的锁在保留窗口内不因“删除这条成绩”解除。锁容量满且未过期时，允许练习并提示清理或换设备，不能静默删除锁以接受重复正式成绩。过期按 `Date.now()` 只管理保留，不影响评分；检测当前日期早于存档日期时暂不做时间删除，继续容量限制。

“重玩”按整局finish/start创建新练习，不撤回旧目标；“换下一位玩家”调用createPlayerSlot；“删除这条记录”保留正式锁；“清除本机游戏记录”明确展示删除数量与活动局影响、二次点击后清本键结果/锁/草稿而保留偏好；“恢复本机游戏初始状态”才恢复匿名与静音默认。绝不localStorage.clear()；删除后无法核验旧参赛次数，如实说明，老师可换轮次码。

## 解析、迁移与失败

读取/写入/删除均捕获 `SecurityError`、`QuotaExceededError` 和 JSON 错误。不可用时使用本页内存记录，持续显示“本次成绩可查看，本机未保存”；不禁用学习、不发送数据、不伪装保存成功。正式挑战在只读/禁用存储条件下可玩，但显示“本页临时挑战：刷新会丢失记录”，只参与人工核对，不宣称本地次数锁可靠。写失败不覆盖最后一份有效字符串。

解析器逐字段验证版本、枚举、字符串长度、正式durationMs=360000及有限非负elapsedMs、练习durationMs/elapsedMs为null、目标唯一性、权重总和、firstCorrect⇒completed&&!usedHint、分项公式和总分范围；存档显示可据合法目标摘要重算同版本分数，不信任外来total。练习、abandoned与interrupted的score为null且eligible=false，只有首轮正式completed/timeout可eligible。格式损坏则退回空内存并提示，保留原始键供显式清除，不自动覆写。单条结果损坏时丢弃该条并报告条数，保留其锁与合法记录。未知较新schema只读保留并提示版本不兼容，不降级覆写。

首版无历史新游戏schema，因此不虚构迁移。后续升级使用纯函数migrateArcadeStore(raw,targetVersion)：只接受已知旧版，补缺省字段、保留原contentVersion/scoringVersion/durationMs及旧分数；完整验证后一次写新键，写失败留旧键。旧章节transient状态没有迁移路径。

对照当前显示的成绩卡足以完成本轮比较。打印/导出单卡及教师汇总均属后续可选范围，不进入本期文件或验收。

## 实施验收

1. `tests/unit/arcade/scoring.test.ts` 固定验证上表、0/1000边界、非法权重、同revision重复检查、首次错后真实编辑纠正、完成前提示/完成后说明、重复终局、先超时后提交、不同档位/版本/时长不能比较；连胜不改分。
2. tests/unit/arcade/session.test.ts验证record boolean/空facts、拒绝不提交state、session绑定runId/seq、postreturn microtask/首次订阅立即、练习只读与整局重玩；暂停/隐藏继续单调时间，真实页面导航/pagehide含BFCache中断、返回ready无正式恢复，预算边界优先。
3. `tests/unit/arcade/storage.test.ts` 验证完整config/目标摘要草稿重载、开B不结束A、显式expectedRunId清理中断一次/ID不符不操作、bootstrap只报告/mount不检查；偏好静音默认/updatePreferences/新玩家槽位/改名不解锁；配额禁用/损坏/未来schema/保留清除/容量/常规所有权。01理由原文从所有序列化对象排除；迁移新增须旧版固定样本。
4. tests/e2e/arcade-competition.spec.ts验证按钮导航到真实独立HTML/URL变化/无旧app挂载，两独立context同码同动作时间同分且存档隔离，同origin开B不结束A。隐藏超时、页面离开interrupted一次、返回ready无正式恢复、明确清理才中断另一窗口；练习/正式分组、改名不解锁、存储失败可玩、旧展厅和04回归。
5. `npm run test:unit -- tests/unit/arcade`、`npm run build`、相关新旧 E2E 通过后才记录为实现完成。此文的测试与公式示例是待实现验收，并非当前已执行的产品验证。
