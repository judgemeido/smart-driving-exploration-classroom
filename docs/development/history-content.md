# 01 内容修改指南

原展厅现有23件展品、档案与年份定位；新增动手内容在独立 `/games/history/index.html`。

第一章以鸿蒙智行为主线：`mainline` 标注问界、智界、享界、尊界、尚界五个节点，自动生成时间线前的主线导览与强调样式；历史展品仍按年代展开。蔚来换电、理想增程、比亚迪刀片电池、吉利极氪平台作为产业展品穿插其中；其他国内车企的名字在产业回顾正文中简短提及。新增图片许可在 `THIRD_PARTY_NOTICES.md`，照片日期与事件日期分别说明。

2026-11-12：第一章新增问界M5、萝卜快跑商业服务、鸿蒙智行/智界S7、享界S9、尊界S800、尚界H5六个节点。用长安睿骋车型照片替换国外测试车，用禾赛研发制造中心替换国外传感器照片；车型照片注明拍摄年份，不冒充发布或测试现场。保留桌面单行展品与移动端纵向布局，不显示图片署名与来源链接。史料与图片许可见 `authoring/history-china-update-20261112/` 及根目录 `THIRD_PARTY_NOTICES.md`。原动手活动题库保持独立。

| 修改 | 位置（src下） |
| --- | --- |
| 展品年份/故事/图片/alt | chapters/history/data.ts 的historyExhibits/archiveAssets |
| 时间线/档案HTML、定位 | chapters/history/render.ts、controller.ts、view.ts |
| 原主题/史料引用 | chapters/history/learning-data.ts，仍保留纯数据 |
| 活动来源与五事件/三需求/四未来价值 | activities/history-lab/source.ts、content.ts |
| 插入重排、装配、提示/锁定、未来理由 | activities/history-lab/state.ts |
| 先record再提交 | activities/history-lab/transaction.ts |
| 稳定DOM、拖动/键盘/IME/焦点 | activities/history-lab/controller.ts、control-state.ts、view.ts |
| 几何车厢/关系图、响应式 | activities/history-lab/graphics.ts、styles.css |

五事件为2001/2009/2015–2016/2020/2026.03；初始排列由挑战种子决定。一次插入一张，其他顺移；检查指出第一倒置，不自动排序。已确认目标本局只读。

工厂、能源、道路用真实关系装配；电池/混动/氢能各分支接受，共享一个能源目标。未来卡要求能力/帮助对象/条件；四价值均接受，理由可省或0–120 Unicode字符。原始输入用textContent/value，IME组合结束前不提交。理由只保留页内存，不存档、不评文采。

旧history/learning-state.ts与learning-view.ts已撤出，不应重加旧入口。共享准备/教程/计时/分数/历史在ui/arcade与shared/arcade。

检查：`npm run test:unit -- tests/unit/history tests/unit/history-lab`，集成构建后运行history-domain/history-learning/history-lab-ui；完整`npm run check`。[公共内容地图](../engineering/content-editing-guide.md)。
