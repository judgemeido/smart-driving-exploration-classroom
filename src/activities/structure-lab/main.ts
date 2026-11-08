import { bootstrapActivity } from '../bootstrap';
import { view, mount } from './index';
bootstrapActivity(document.querySelector<HTMLElement>('#app')!, {
  activityId: 'structure-lab',
  title: '系统维修台',
  galleryHref: 'index.html#explore',
  view,
  mount,
});
