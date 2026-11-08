# 智驾探索课堂

面向小学三至六年级的智能驾驶网页科普课堂。教师先讲解，学生每人一台电脑，通过选择预测、操作模型、比较证据和选择发现完成学习，无需实体部件或打字。

使用 TypeScript、Vite 6 和 Three.js，纯前端运行。00比较电池，01观察整车演进，02–03使用机械拆解与感知实验台；原版历史博物馆、3D汽车、激光雷达及04道路安全展厅通过独立入口保留。

## 本地运行

建议使用 Node.js 24，并安装 Google Chrome 以运行浏览器测试。

```sh
npm ci
npm run dev
```

生产构建与预览：

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

打开 `http://127.0.0.1:4173/`。支持通过 Vite `--base` 参数部署到子路径。

## 当前内容

| 章节 | 入口 | 学习内容 |
| --- | --- | --- |
| 00 电池怎样发展 | `/index.html#battery/B1` | 铅酸、镍氢、磷酸铁锂、三元锂的结构与发展，充放电方向和使用取舍 |
| 01 汽车如何进化 | `/games/history/index.html#history/H1` | 四种时代整车切换、打开车身、动力路径演示与纯电断路对照 |
| 02 打开汽车看系统 | `/games/structure/index.html#explore/E1` | 电池、电机、齿轮、半轴、电控与制动拆解；输入、计算、执行的诊断与修复 |
| 03 让汽车感知世界 | `/games/sensor/index.html#lidar/S1` | 摄像头、毫米波雷达、激光雷达结构；光脉冲测距、角度、遮挡与天气对照 |
| 04 安全上路 | `/legacy.html#traffic` | 保留的道路安全活动与练习 |
| 原版博物馆 | `/legacy.html#history` | 原历史展厅、3D汽车、激光雷达与道路安全四章导航 |
| 我的学习记录 | `/index.html#report` | 本机证据与发现、JSON导出和恢复 |

机械台提供装配、剖视、分解、部件点选、局部观察及全屏放大。电驱台包含铜绕组、转子、18/54齿轮、制动盘与电池层结构；感知台包含发射接收光路、镜组、成像芯片和天线阵列。结构放大观察与米制测距现场分开，读数由实验状态计算。

01整车已重建为独立机械总成：曲面车身与玻璃、承载底盘、悬架、开放轮毂、带孔制动盘、模组电池、定转子、电控与冷却管路。点选部件进入特写，淡化保留周围位置参照；历史车型保留车架、飞轮、皮带和早期电池特征。建模工艺参考用户提供的 cassette-source，具体来源、结构及边界见[机械整车说明](docs/engineering/mechanical-car-craft.md)。

课堂包含八项探索活动和两轮知识交流，首页从00开始，无倒计时、生命值或排名。05、06仍为规划内容，未作为页面交付。

## 检查

```sh
npm run test:unit
npm run build
npm run test:e2e
# 或执行完整检查
npm run check
```

浏览器测试使用4173端口的生产预览，需先构建。默认使用系统 Google Chrome；也可安装 `npx playwright install chromium`，并设置 `PLAYWRIGHT_CHANNEL=chromium`。

## 代码与文档

- 当前课堂入口、舞台、活动与记录：`src/learning/`。
- 原版展馆入口：`legacy.html`、`src/legacy.ts`，章节注册表为 `src/app/chapters.ts`。
- [教师使用说明](docs/engineering/teardown-learning-guide.md)。
- [机械模型来源与科学边界](docs/engineering/teardown-learning-sources.md)。
- [验证记录](docs/engineering/teardown-learning-verification.md)。
- [机械台升级计划](docs/superpowers/plans/2026-11-09-mechanical-classroom-upgrade.md)。
- [第三方资源说明](THIRD_PARTY_NOTICES.md)。

机械交互参考 [teardown](https://github.com/elvarofficial/teardown) 的状态、几何、舞台和控制分层方法，使用现有 Three.js 自行实现。

## 使用边界

模型是教学简化机构，非量产车CAD或维修指引；天气为定性样例，不代表设备真实性能。尚未进行儿童试讲和真实教室设备性能验收。

学习记录仅保存在当前浏览器，可导出备份；没有后端、教师远程控班或跨设备自动同步。旧活动记录保留，不自动转换为新版学习记录。

旧方案、宣传材料和历史验收文档作为项目资料保留；其中未实施的设想不代表当前功能，以本页、`src/learning/`及最新验证记录为准。第三方模型、图片及品牌的使用权分别适用其原有许可，本仓库未声明统一的开源许可。
