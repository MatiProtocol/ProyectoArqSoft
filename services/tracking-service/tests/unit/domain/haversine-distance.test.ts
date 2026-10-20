import { haversineDistanceMeters } from '../../../src/domain/geo/haversine-distance';

describe('haversineDistanceMeters', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistanceMeters([-56.16, -34.9], [-56.16, -34.9])).toBe(0);
  });

  it('approximates a known short distance', () => {
    const distance = haversineDistanceMeters([-56.16, -34.9], [-56.16, -33.9]);
    expect(distance).toBeGreaterThan(110000);
    expect(distance).toBeLessThan(112000);
  });

  it('is symmetric', () => {
    const a = haversineDistanceMeters([-56.16, -34.9], [-56.18, -34.92]);
    const b = haversineDistanceMeters([-56.18, -34.92], [-56.16, -34.9]);
    expect(a).toBeCloseTo(b, 6);
  });
});
