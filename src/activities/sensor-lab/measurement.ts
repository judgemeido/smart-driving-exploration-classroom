import { roundTripNanoseconds } from './source';
import type { Point, Profile, RayHit } from './types';

export function getDistanceMeters(point:Point): number {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new RangeError('反射点必须是有限米制坐标');
  return Math.round(Math.hypot(point.x,point.y)*1e9)/1e9;
}
export function hitReflectiveMarker(origin:Point,angle:number,point:Point,half:number):RayHit|null {
  if (!Number.isFinite(angle)||!Number.isFinite(half)||half<0) return null;
  const delta = {x:point.x-origin.x,y:point.y-origin.y};
  const distanceMeters = getDistanceMeters(delta);
  const bearing = Math.atan2(delta.y,delta.x)*180/Math.PI;
  const difference = Math.abs(((bearing-angle+540)%360)-180);
  return difference <= half+1e-9 ? {reflectivePoint:point,distanceMeters,roundTripNanoseconds:roundTripNanoseconds(distanceMeters)} : null;
}
export function getScanSlotsBetween(previous:number,next:number):number[] {
  if (!Number.isFinite(previous)||!Number.isFinite(next)) return [];
  const from = Math.max(-40,Math.min(40,previous));
  const to = Math.max(-40,Math.min(40,next));
  const slots = Array.from({length:21},(_,i)=>-40+i*4).filter(n=>n>=Math.min(from,to)&&n<=Math.max(from,to));
  return to<from ? slots.reverse() : slots;
}
export function rulerMatches(actual:number,expected:number,profile:Profile):boolean {
  return Number.isFinite(actual)&&Math.abs(actual-expected)<=(profile==='guided'?1:0.5)+1e-9;
}
