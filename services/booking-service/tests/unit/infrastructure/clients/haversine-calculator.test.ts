import { haversineDistanceKm } from '../../../../src/infrastructure/clients/haversine-calculator';

describe('haversineDistanceKm', () => {
  it('should calculate distance 0 for the same point', () => {
    const point: [number, number] = [-56.16, -34.9];
    const distance = haversineDistanceKm(point, point);
    expect(distance).toBe(0);
  });

  it('should calculate the correct distance between two points (Montevideo)', () => {
    const origin: [number, number] = [-56.1997, -34.9069];
    const destination: [number, number] = [-56.1668, -34.8943];

    const distance = haversineDistanceKm(origin, destination);
    expect(distance).toBeGreaterThan(3.0);
    expect(distance).toBeLessThan(3.6);
  });

  it('should calculate symmetric distance regardless of order', () => {
    const origin: [number, number] = [-56.1997, -34.9069];
    const destination: [number, number] = [-56.1668, -34.8943];

    const distance1 = haversineDistanceKm(origin, destination);
    const distance2 = haversineDistanceKm(destination, origin);

    expect(distance1).toBe(distance2);
  });

  it('should calculate large distances correctly (Montevideo to Buenos Aires)', () => {
    const mvd: [number, number] = [-56.1645, -34.9011];
    const bue: [number, number] = [-58.3816, -34.6037];

    const distance = haversineDistanceKm(mvd, bue);
    expect(distance).toBeGreaterThan(190);
    expect(distance).toBeLessThan(220);
  });
});
