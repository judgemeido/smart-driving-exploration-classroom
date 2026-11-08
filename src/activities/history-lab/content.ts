import { getHistorySource } from './source';
const source = getHistorySource().learning;
export interface Module { readonly id:string; readonly label:string; readonly kind:'process'|'source'|'conversion'|'motion'|'sensing'|'analysis'|'action'|'appearance' }
export interface Need { readonly id:string; readonly title:string; readonly goal:string; readonly slots:readonly {id:string;label:string}[]; readonly modules:readonly string[]; readonly solution:readonly string[]; readonly success:string }
export const energyPlans = [
  {id:'energy-plan-battery',label:'纯电',modules:['energy-source-battery','energy-convert-motor','energy-motion-wheel']},
  {id:'energy-plan-hybrid',label:'混合动力',modules:['energy-source-hybrid','energy-convert-hybrid','energy-motion-wheel']},
  {id:'energy-plan-hydrogen',label:'氢燃料电池',modules:['energy-source-hydrogen','energy-convert-fuelcell','energy-motion-wheel']},
] as const;
export const modules:readonly Module[] = [
  {id:'production-divide',label:'分步骤加工',kind:'process'},
  {id:'production-cooperate',label:'连续工序配合',kind:'process'},
  {id:'production-alone',label:'每人独自从头做完',kind:'process'},
  {id:'appearance-light',label:'车灯更亮',kind:'appearance'},
  {id:'appearance-color',label:'增加车身颜色',kind:'appearance'},
  {id:'energy-source-battery',label:'电池里的电能',kind:'source'},
  {id:'energy-source-hybrid',label:'燃油与电池的电能',kind:'source'},
  {id:'energy-source-hydrogen',label:'氢与氧参与反应',kind:'source'},
  {id:'energy-convert-motor',label:'电机把电能变成转动',kind:'conversion'},
  {id:'energy-convert-hybrid',label:'发动机与电机按方案配合',kind:'conversion'},
  {id:'energy-convert-fuelcell',label:'燃料电池发电，再由电机转动',kind:'conversion'},
  {id:'energy-motion-wheel',label:'传动配合车轮运动',kind:'motion'},
  {id:'road-camera',label:'摄像头收集道路信息',kind:'sensing'},
  {id:'road-radar',label:'雷达收集道路信息',kind:'sensing'},
  {id:'road-analysis',label:'计算系统分析信息',kind:'analysis'},
  {id:'road-action',label:'提醒／减速等合适行动',kind:'action'},
];
export const futureClaims = source.futureActivity.choices.map((choice,index)=>({
  ...choice,
  who: [
    ['学校附近的行人','路口等待通行的人'],
    ['补能不便的出行者','长途出行需要补能的人'],
    ['有不同乘坐需要的人','需要更方便上下车的人'],
    ['车里的乘坐者','需要平稳乘坐的人'],
  ][index].map((label,i)=>({id:`${choice.id}-who-${i}`,label})),
  condition:{id:`${choice.id}-condition`,label:[
    '可靠探测与合适行动配合','补能设施与能源条件配合','适合的入口与人机界面配合','路况与悬架、座舱等配合',
  ][index]},
}));
export const historyLabContent = {
  version:'history-lab-2026.11.08',
  events:source.orderActivity.cards,
  order:source.orderActivity.correctOrder,
  objectives:[
    {id:'history-event-order',weight:400}, {id:'history-efficiency',weight:100},
    {id:'history-cleaner-energy',weight:100}, {id:'history-complex-road',weight:100},
    {id:'history-future-choice',weight:300},
  ],
  needs:[
    {id:'history-efficiency',title:'让工序接起来',goal:'把两道工序装成连续的生产流程',slots:[{id:'production-step',label:'加工方式'},{id:'production-flow',label:'工序关系'}],modules:['production-divide','production-cooperate','appearance-light','appearance-color','production-alone'],solution:['production-divide','production-cooperate'],success:source.matchQuestions[0].correctFeedback},
    {id:'history-cleaner-energy',title:'让能量走到车轮',goal:'装出来源、转化和运动的完整路径',slots:[{id:'energy-source',label:'来源'},{id:'energy-conversion',label:'转化'},{id:'energy-motion',label:'运动'}],modules:modules.filter(m=>['source','conversion','motion'].includes(m.kind)).map(m=>m.id),solution:[],success:source.matchQuestions[1].correctFeedback},
    {id:'history-complex-road',title:'让观察变成行动',goal:'把道路信息送到分析和行动环节',slots:[{id:'road-input',label:'收集信息'},{id:'road-compute',label:'分析信息'},{id:'road-response',label:'合适行动'}],modules:['road-camera','road-radar','road-analysis','road-action','appearance-color'],solution:['road-camera','road-analysis','road-action'],success:source.matchQuestions[2].correctFeedback},
  ] satisfies readonly Need[],
} as const;
export function moduleById(id:string|undefined) { return modules.find(module=>module.id===id); }
