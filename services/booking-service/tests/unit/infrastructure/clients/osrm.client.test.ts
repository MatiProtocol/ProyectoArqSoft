import { createExternalServiceCircuitBreaker } from '../../../../src/infrastructure/circuit-breakers/external-service-circuit-breaker';
import { OsrmGeoDistanceClient } from '../../../../src/infrastructure/clients/osrm.client';

jest.mock(
  '../../../../src/infrastructure/circuit-breakers/external-service-circuit-breaker',
  () => ({
    createExternalServiceCircuitBreaker: jest.fn(),
  })
);

jest.mock('../../../../src/infrastructure/clients/haversine-calculator', () => ({
  haversineDistanceKm: jest.fn().mockReturnValue(12.34),
}));

import { haversineDistanceKm } from '../../../../src/infrastructure/clients/haversine-calculator';

describe('OsrmGeoDistanceClient', () => {
  const mockConfig = {
    baseUrl: 'http://osrm.local',
    timeoutMs: 1000,
    baseRatePerKm: 5,
    surchargePercentPerRule: 20,
  };

  let client: OsrmGeoDistanceClient;
  let mockBreakerFire: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    mockBreakerFire = jest.fn();
    (createExternalServiceCircuitBreaker as jest.Mock).mockReturnValue({
      fire: mockBreakerFire,
    });

    client = new OsrmGeoDistanceClient(mockConfig);
  });

  describe('getDistanceKm', () => {
    it('should return OSRM distance and degraded=false if circuit breaker succeeds', async () => {
      mockBreakerFire.mockResolvedValueOnce(5.5);

      const result = await client.getDistanceKm([-56.1, -34.9], [-56.2, -34.8]);

      expect(mockBreakerFire).toHaveBeenCalledWith([-56.1, -34.9], [-56.2, -34.8]);
      expect(result).toEqual({ distanceKm: 5.5, degraded: false });
    });

    it('should return haversine distance and degraded=true if circuit breaker fails', async () => {
      mockBreakerFire.mockRejectedValueOnce(new Error('Circuit breaker open'));

      const result = await client.getDistanceKm([-56.1, -34.9], [-56.2, -34.8]);

      expect(haversineDistanceKm).toHaveBeenCalledWith([-56.1, -34.9], [-56.2, -34.8]);
      expect(result).toEqual({ distanceKm: 12.34, degraded: true });
    });
  });

  describe('fetchOsrmDistanceKm (via breaker callback)', () => {
    let actionCallback: (origin: [number, number], dest: [number, number]) => Promise<number>;

    beforeEach(() => {
      const calls = (createExternalServiceCircuitBreaker as jest.Mock).mock.calls;
      actionCallback = calls[0][0];
    });

    it('should fetch from correct URL and return distance in km', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ routes: [{ distance: 5500 }] }),
      });

      const distance = await actionCallback([-56.1, -34.9], [-56.2, -34.8]);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://osrm.local/route/v1/driving/-56.1,-34.9;-56.2,-34.8?overview=false',
        { signal: expect.any(AbortSignal) }
      );
      expect(distance).toBe(5.5); // 5500 meters = 5.5 km
    });

    it('should throw if fetch fails (e.g. 500 error)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(actionCallback([-56.1, -34.9], [-56.2, -34.8])).rejects.toThrow(
        'OSRM returned 500'
      );
    });

    it('should throw if routes array is empty or missing', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ routes: [] }),
      });

      await expect(actionCallback([-56.1, -34.9], [-56.2, -34.8])).rejects.toThrow(
        'OSRM returned no routes'
      );
    });

    it('should abort fetch if it times out', async () => {
      jest.useFakeTimers();

      (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));

      const promise = actionCallback([-56.1, -34.9], [-56.2, -34.8]);

      jest.advanceTimersByTime(1000);

      const calls = (global.fetch as jest.Mock).mock.calls;
      const signal = calls[0][1].signal as AbortSignal;

      expect(signal.aborted).toBe(true);

      jest.useRealTimers();
    });
  });
});
