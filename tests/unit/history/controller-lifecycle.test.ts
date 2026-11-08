import {afterEach,expect,it,vi} from 'vitest';
import {mount} from '../../../src/chapters/history/controller';
import type {ChapterController} from '../../../src/app/types';
class GalleryElement extends EventTarget {
  dataset:Record<string,string>={timelineTarget:'archive-2001'};id='archive-2001';
  selected=false;visits=0;innerHTML='';
  classList={toggle:(_name:string,value:boolean)=>{this.selected=value;}};
  closest(){return this;}
  scrollIntoView(){this.visits++;}
}
class GalleryHost extends EventTarget {
  timeline=new GalleryElement();archive=new GalleryElement();button=new GalleryElement();article=new GalleryElement();
  querySelector(selector:string){return selector==='[data-history-timeline]'?this.timeline:selector==='[data-history-archive-list]'?this.archive:null;}
  querySelectorAll(selector:string){return selector==='[data-timeline-target]'?[this.button]:[this.article];}
  contains(element:unknown){return element===this.button;}
  click(){const event=new Event('click');Object.defineProperty(event,'target',{value:this.button});this.dispatchEvent(event);}
}
const controllers:ChapterController[]=[];
afterEach(()=>{controllers.splice(0).forEach(controller=>controller.dispose());vi.unstubAllGlobals();});
it('retains all fourteen rendered exhibits and the original year navigation',()=>{
  vi.stubGlobal('Element',GalleryElement);const host=new GalleryHost();const controller=mount(host as unknown as HTMLElement);controllers.push(controller);
  expect(host.archive.innerHTML.match(/data-archive-article/g)).toHaveLength(14);
  host.click();expect(host.article.visits).toBe(1);expect(host.button.selected).toBe(true);
});
it('suspends navigation when inactive and removes navigation listeners on disposal',()=>{
  vi.stubGlobal('Element',GalleryElement);const host=new GalleryHost();const controller=mount(host as unknown as HTMLElement);controllers.push(controller);
  controller.setActive(false);host.click();expect(host.article.visits).toBe(0);
  controller.setActive(true);host.click();expect(host.article.visits).toBe(1);
  controller.dispose();controller.setActive(true);host.click();expect(host.article.visits).toBe(1);
});
