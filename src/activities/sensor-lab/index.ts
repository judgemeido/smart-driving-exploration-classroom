import { mountArcade } from '../../ui/arcade/shell';
import { SENSOR_OBJECTIVES } from './content';
import { createSensorGame } from './controller';
import './styles.css';
export { view } from './view';
export const definition={activityId:'sensor-lab' as const,title:'回波侦探',description:'转动方向、接住回波，再用距离与天气证据完成三次实验。',objectives:SENSOR_OBJECTIVES,createGame:createSensorGame};
export function mount(host:HTMLElement) {return mountArcade(host,definition);}
