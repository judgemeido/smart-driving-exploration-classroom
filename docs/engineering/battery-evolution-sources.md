# 00 电池与 01 整车：事实来源和教学边界

本页区分项目内已查阅的资料与供教师进一步核查的公开来源。本轮未联网读取下面网站的正文，URL 不表示已逐条完成外部史料核验；课堂讲稿如需引用原文、精确年份或数值，应先打开相应来源核对。

## 项目内资料

- `src/chapters/history/data.ts`：原展馆使用了中国新能源政策、示范应用与车型照片的出处；照片说明明确区分展品照片与当年事件现场。不能将其中的2001、2008等中国发展节点改作全球汽车发明年份。
- `src/learning/activities/history.ts`：已有燃油、纯电、混合动力三种能源路径；明确纯电无行驶尾气不等于全生命周期无环境影响，混动不全是可外接充电。
- `src/learning/activities/history-state.ts`：原排序和能量功能模型的本地依据。断路模型没有惯性，不用于证明真实车辆断电后立刻停止。

## 供教师核查的公开权威参考

| 来源 | 建议核查的事实 | 课堂使用边界 |
|---|---|---|
| [美国能源部：电动汽车历史](https://www.energy.gov/articles/history-electric-car) | 早期电动汽车在约1900年前后的应用；电动车并非近年才出现 | 不将单一车型称为世界第一辆电动车；不同地区和发明阶段有不同口径 |
| [Mercedes-Benz：1886 Benz Patent Motor Car](https://www.mercedes-benz.com/en/art-and-culture/museum/mercedes-benz-museum/exhibitions/benz-patent-motor-car/) | 1886专利汽车的三轮外形和燃油发动机驱动 | 作为燃油先驱代表，不将其等同现代所有汽车的唯一起点 |
| [Toyota：Prius发展史](https://global.toyota/en/prius20th/) | 1997 Prius上市与量产混合动力的阶段 | 不把混合动力描述为1997才被发明；避免把所有混动都画成可插电车型 |
| [美国能源部 AFDC：电动车电池](https://afdc.energy.gov/vehicles/electric-batteries) | 铅酸、镍氢、锂离子在车辆中的用途及取舍 | 镍氢仍有应用；磷酸铁锂、三元锂是锂离子技术中的不同正极路线，不能排成互相完全替代的直线 |
| [美国能源部：电池工作原理](https://www.energy.gov/energysaver/how-batteries-work) | 充放电涉及电化学过程，电能与化学能相互转换 | 动画中的粒子方向、数量、速度为示意，不代表实际离子轨迹或电化学求解 |
| [诺贝尔化学奖2019：锂离子电池的发展](https://www.nobelprize.org/prizes/chemistry/2019/popular-information/) | 蓄电池与锂离子电池发展、1991商业化节点 | 不把商业化节点误说成所有锂电池都在该年发明或开始用于汽车 |
| [Argonne：电池研究](https://www.anl.gov/chemical-sciences-and-engineering/batteries) | 电池材料与系统持续研究，材料选择涉及性能取舍 | 不从材料类别单独推出真实车型续航、寿命或安全排名 |

## 模型不应暗示的结论

四种电池用于比较结构和充放电方向；画面大小不等于实际容量，相同动画时间不等于真实充电时间。电池表现受配方、温度、管理系统、结构和使用条件影响。没有给定条件与测量来源时，不应展示精确能量密度、续航、循环寿命或绝对安全排名。

四种整车是跨阶段代表性教学造型，不是原厂CAD。约1900早期电动与当代纯电都使用电机，外形和控制能力差别不意味着能量守恒规律改变。01观察整车能源与外形，02局部台架观察电池、电机、电控与传动协作；两者承担不同问题。
