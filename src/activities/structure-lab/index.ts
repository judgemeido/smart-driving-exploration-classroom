import { mountArcade } from '../../ui/arcade/shell';
import { structureContent } from './content';
import { createStructureGame } from './controller';
import './styles.css';
export { view } from './view';
export function mount(host: HTMLElement) {
  return mountArcade(host, {
    activityId: 'structure-lab',
    title: '系统维修台',
    description: '补装部件，连出汽车系统的功能关系。',
    objectives: structureContent.objectives.map(({ id, weight }) => ({ id, weight })),
    tutorial: [
      '先选一个部件，再点击图中需要这类功能的位置。也可以拖放；Escape 取消选择。',
      '按“试运行”查看功能证据，缺件不算错，正确部件会固定，错件可以单独替换。',
      '部件齐全后，先点起点和终点（或拖线选择两个端点），再选关系标签并连接。箭头表示功能方向，错线可单独删除。',
      '支撑台需要悬架和制动；轮胎装好后，还要切换到湿滑路面观察。完成一台后主动前往下一台。',
    ],
    createGame: createStructureGame,
  });
}
