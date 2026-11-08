import { bootstrapActivity } from '../bootstrap';
import { view,mount } from './index';
bootstrapActivity(document.querySelector<HTMLElement>('#app')!,{activityId:'history-lab',title:'进化修复站',galleryHref:'index.html#history',view,mount});
