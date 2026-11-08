import { describe, expect, it } from 'vitest';
import {
  normalizeSensorDraft,
  traceSensor,
  sensorObservation,
} from '../../../src/learning/activities/sensor-state';

describe('sensor experiment domain', () => {
  it('restores safe controls from malformed persisted data', () => {
    expect(
      normalizeSensorDraft({ distance: -9, angle: Infinity, weather: 'snow', occluded: 'false' }),
    ).toMatchObject({ distance: 16, angle: 0, weather: 'clear', occluded: false });
    expect(normalizeSensorDraft({ distance: 60, sensor: 'radar' })).toMatchObject({
      distance: 60,
      sensor: 'radar',
    });
  });
  it('computes round trip time from path distance', () => {
    expect(traceSensor(normalizeSensorDraft({ distance: 16 })).timeNs).toBeCloseTo(106.7, 1);
    expect(traceSensor(normalizeSensorDraft({ distance: 60 })).timeNs).toBeCloseTo(400.3, 1);
    expect(traceSensor(normalizeSensorDraft({ distance: 30 })).timeNs).toBeCloseTo(200.1, 1);
  });
  it('clears the measurement when beam misses and returns nearest obstructing surface', () => {
    expect(traceSensor(normalizeSensorDraft({ distance: 16, angle: 20 }))).toMatchObject({
      status: 'miss',
      distance: null,
      timeNs: null,
    });
    expect(traceSensor(normalizeSensorDraft({ distance: 16, occluded: true }))).toMatchObject({
      status: 'occluded',
      distance: 8,
    });
    expect(traceSensor(normalizeSensorDraft({ distance: 5, occluded: true }))).toMatchObject({
      status: 'available',
      distance: 5,
    });
  });
  it('allows light rain and treats dense fog as unknown', () => {
    expect(traceSensor(normalizeSensorDraft({ weather: 'rain' })).status).toBe('available');
    expect(traceSensor(normalizeSensorDraft({ weather: 'fog' }))).toMatchObject({
      status: 'unknown',
      distance: null,
      timeNs: null,
    });
    const result = sensorObservation('S3', normalizeSensorDraft({ weather: 'fog' }));
    expect(result.valid).toBe(true);
    expect(result.summary).toContain('未知');
  });
  it('distinguishes the information supplied by each sensor', () => {
    const camera = sensorObservation('S1', normalizeSensorDraft({ sensor: 'camera' }));
    const radar = sensorObservation('S1', normalizeSensorDraft({ sensor: 'radar' }));
    const lidar = sensorObservation('S1', normalizeSensorDraft({ sensor: 'lidar' }));
    expect(camera.metrics.some((x) => x.value.includes('图像'))).toBe(true);
    expect(radar.metrics.some((x) => x.value.includes('相对运动'))).toBe(true);
    expect(lidar.metrics.some((x) => x.value.includes('轮廓'))).toBe(true);
    expect(radar.notes.join('')).toContain('灯色');
    expect(lidar.notes.join('')).toContain('灯色');
  });
});
