import {describe,it,expect} from 'vitest';
import {stageGeometry} from '../../../src/activities/sensor-lab/graphics';
import {createSensorScenario} from '../../../src/activities/sensor-lab/scenario';
describe('metre stage layout',()=>{
  it.each([260,280,350,760,930])('keeps all reference points and full labels inside a %spx stage',width=>{
    for(const seed of ['7K2M4C',1,2,3,4,5]) for(const stage of ['pulse','scan','weather'] as const) {
      const scenario=createSensorScenario({seed,profile:'guided'});
      const g=stageGeometry(stage,scenario,width);
      const targets=stage==='weather'?scenario.weatherTargets:stage==='pulse'?scenario.targets.slice(0,1):scenario.targets;
      for(const target of targets) {
        const p=g.point(target.reflectivePoint);
        const labelHalf=stage==='weather'?60:36;
        expect(p.x-labelHalf).toBeGreaterThanOrEqual(8);
        expect(p.x+labelHalf).toBeLessThanOrEqual(g.width-8);
        expect(p.y-(stage==='weather'?66:49)).toBeGreaterThanOrEqual(8);
        expect(p.y+(stage==='weather'?55:22)).toBeLessThanOrEqual(g.height-(stage==='scan'?80:8));
      }
      const origin=g.point({x:0,y:0});
      expect(origin.x-48).toBeGreaterThanOrEqual(8);
      expect(origin.y+60).toBeLessThanOrEqual(g.height-8);
      expect(g.point({x:g.maxMeters,y:0}).x).toBeLessThanOrEqual(g.width-24);
    }
  });
});
