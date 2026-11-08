import { bootstrapActivity } from '../bootstrap';
import { mount, view } from './index';
bootstrapActivity(document.querySelector<HTMLElement>('#app')!,{activityId:'sensor-lab',title:'回波侦探',galleryHref:'index.html#lidar',view,mount});
