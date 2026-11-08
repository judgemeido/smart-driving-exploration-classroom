import { mountArcade } from '../../ui/arcade/shell';
import { createHistoryGame } from './controller';
import { historyLabContent } from './content';
import './styles.css';
export const view='<div class="activity-game"></div>';
export function mount(host:HTMLElement){
  return mountArcade(host,{activityId:'history-lab',title:'进化修复站',description:'连接五节时间轨道，把生活需求装成技术方案，再做一张能解释的未来汽车卡。',objectives:historyLabContent.objectives,createGame:createHistoryGame});
}
