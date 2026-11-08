# 智驾博物馆

中国新能源汽车、车辆结构、激光雷达和道路安全四个互动展厅，另有三个独立二维科学活动。TypeScript + Vite 6 + Three.js，纯前端静态应用；科学活动不加载三维库或模型。

## 启动和检查

建议 Node.js 24。首次安装执行 `npm ci`，开发执行 `npm run dev`。

```sh
npm run test:unit
npm run build
npm run test:e2e
npm run check
```

浏览器测试默认 Google Chrome、生产预览端口4173，必须先构建。使用 Playwright Chromium 时安装 `npx playwright install chromium`，设置 `PLAYWRIGHT_CHANNEL=chromium`。产物在dist；支持Vite `--base`子路径部署。

## 浏览与动手操作

| 页面 | 路径 | 内容 |
| --- | --- | --- |
| 四个原展厅 | `/index.html#history`、`#explore`、`#lidar`、`#traffic` | 14展品、三维拆解、雷达演示、道路安全 |
| 01 进化修复站 | `/games/history/index.html` | 时间轨道、需求装配、未来说明卡 |
| 02 系统维修台 | `/games/structure/index.html` | 三个系统、13部件主题、3张功能关系图 |
| 03 回波侦探 | `/games/sensor/index.html` | 发射与接收、扫描测量、天气证据与行动 |

菜单将原展厅与对应活动并列。原展厅章节总数仍为04，独立活动刷新与返回使用真实HTML页面。旧01主题/任务、02十三挑战、03新学习区的重复UI和专属逻辑已迁出；02复习与四步归位、04全部保留。

练习不限时、不提供正式分数；正式挑战6分钟。同活动、同挑战码、同档位、同内容/评分版本的首次正式成绩才可比较。暂停/后台不暂停正式倒计时，离页、刷新与缓存退出会中断。记录只存在当前浏览器，不上传、不跨设备同步；存储失败仍可玩并明确显示未保存。

## 维护

- [当前架构](PROJECT_ARCHITECTURE.md)：入口、依赖、生命周期与数据流。
- [内容修改地图](docs/engineering/content-editing-guide.md)：三活动与四展厅的文件职责。
- [实施验收](docs/engineering/science-activities-ui-verification.md)：测试、尺寸截图、审核、迁移清单与限制。
- [计分与本机记录](docs/engineering/2026-11-08-science-arcade-scoring.md)。

三活动的领域状态位于 `src/activities/*-lab/state.ts`；公共比赛与存储位于 `src/shared/arcade`，公共UI位于 `src/ui/arcade`。原展厅仍由 `src/app/chapters.ts` 注册并按需加载。纯内容只读适配保留原事实来源，不导入旧控制器。

[内容准备稿](docs/content/2026-11-08-upper-primary/README.md)保留作史料与教学参考，运行以有类型的源码为准。第三方模型许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。旧翻新/学习实施文档保留历史记录，当前结构以以上文档为准。
