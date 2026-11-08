import type { Profile, SensorScenario } from './types';
export function createSensorScenario(options:{seed:string|number;profile:Profile;contentVersion?:string}):SensorScenario {
  const hash = typeof options.seed==='number' ? options.seed>>>0 : [...options.seed].reduce((value,c)=>(Math.imul(value,31)+c.charCodeAt(0))>>>0,0);
  const reference = options.seed==='7K2M4C';
  const bearings = reference ? [-20,0,20] : [[-20,0,20],[20,-20,0],[0,20,-20]][hash%3];
  const labels = ['目标 A','目标 B','目标 C'];
  const weather = options.profile==='guided'?'rain':'fog';
  return {
    ...options,contentVersion:options.contentVersion??'1',angleStep:options.profile==='guided'?4:2,
    halfAngleDegrees:options.profile==='guided'?6:4,rulerStep:options.profile==='guided'?1:0.5,rulerTolerance:options.profile==='guided'?1:0.5,weather,
    targets:[8,16,28].map((distance,i)=>({id:`target-${i+1}`,label:labels[i],bearingDegrees:bearings[i],reflectivePoint:{x:distance*Math.cos(bearings[i]*Math.PI/180),y:distance*Math.sin(bearings[i]*Math.PI/180)}})),
    weatherTargets:[8,24].map((distance,i)=>({id:`weather-${i+1}`,label:i===0?'近处路障':'远处移动目标',reflectivePoint:{x:distance,y:0},
      visibleSampleIds:Array.from({length:weather==='fog'&&i===1?2:4},(_,j)=>`${i}-sample-${(j+hash%6)%6}`),
      noiseSampleIds:Array.from({length:weather==='rain'?3:2},(_,j)=>`noise-${i}-${(j+hash%11)%11}`),
    })),
  };
}
