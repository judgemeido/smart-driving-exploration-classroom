import { describe, expect, it } from 'vitest';
import { getDistanceMeters, getScanSlotsBetween, hitReflectiveMarker, rulerMatches } from '../../../src/activities/sensor-lab/measurement';
import { roundTripNanoseconds } from '../../../src/activities/sensor-lab/source';
import { createSensorScenario } from '../../../src/activities/sensor-lab/scenario';

describe('sensor geometry', () => {
  it('uses one reflective point for the hit, metres and round-trip time', () => {
    const hit = hitReflectiveMarker({x:0,y:0}, 0, {x:16,y:0}, 4);
    expect(hit?.distanceMeters).toBe(16);
    expect(hit?.roundTripNanoseconds.toFixed(1)).toBe('106.7');
    expect(roundTripNanoseconds(30).toFixed(1)).toBe('200.1');
    expect(roundTripNanoseconds(60).toFixed(1)).toBe('400.3');
    expect(() => getDistanceMeters({x:-Infinity,y:0})).toThrow();
    expect(() => roundTripNanoseconds(-1)).toThrow();
  });
  it('rejects a missed beam and includes the configured beam boundary', () => {
    expect(hitReflectiveMarker({x:0,y:0}, 6, {x:8,y:0}, 6)).not.toBeNull();
    expect(hitReflectiveMarker({x:0,y:0}, 6.01, {x:8,y:0}, 6)).toBeNull();
    expect(rulerMatches(9,8,'guided')).toBe(true);
    expect(rulerMatches(9.01,8,'guided')).toBe(false);
    expect(rulerMatches(8.5,8,'standard')).toBe(true);
    expect(rulerMatches(8.51,8,'standard')).toBe(false);
  });
  it('visits all 21 fixed scan slots even with one jump', () => {
    expect(getScanSlotsBetween(-40,40)).toEqual([-40,-36,-32,-28,-24,-20,-16,-12,-8,-4,0,4,8,12,16,20,24,28,32,36,40]);
    expect(getScanSlotsBetween(8,-4)).toEqual([8,4,0,-4]);
  });
  it('generates the solvable reference fixture and deterministic weather samples', () => {
    const a = createSensorScenario({seed:'7K2M4C',profile:'guided'});
    const b = createSensorScenario({seed:'7K2M4C',profile:'guided'});
    expect(a).toEqual(b);
    expect(a.targets.map(t => Math.round(getDistanceMeters(t.reflectivePoint)))).toEqual([8,16,28]);
    expect(a.targets.map(t => t.bearingDegrees)).toEqual([-20,0,20]);
    expect(a.weatherTargets.map(t=>t.visibleSampleIds.length)).toEqual([4,4]);
    expect(createSensorScenario({seed:17,profile:'standard'}).weatherTargets.map(t=>t.visibleSampleIds.length)).toEqual([4,2]);
  });
});
