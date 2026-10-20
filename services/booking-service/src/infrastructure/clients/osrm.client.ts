import type {
  GeoDistanceResult,
  IGeoDistanceClient,
} from '../../application/contracts/geo-distance.client';
import type { Coordinates } from '../../domain/value-objects/coordinates';
import {
  createExternalServiceCircuitBreaker,
  type ExternalServiceCircuitBreaker,
} from '../circuit-breakers/external-service-circuit-breaker';
import type { OsrmConfig } from '../config/osrm';
import { haversineDistanceKm } from './haversine-calculator';

type OsrmRouteResponse = {
  routes: { distance: number }[];
};

export class OsrmGeoDistanceClient implements IGeoDistanceClient {
  private readonly breaker: ExternalServiceCircuitBreaker<[Coordinates, Coordinates], number>;

  constructor(private readonly config: OsrmConfig) {
    this.breaker = createExternalServiceCircuitBreaker(
      (origin: Coordinates, destination: Coordinates) =>
        this.fetchOsrmDistanceKm(origin, destination),
      {
        name: 'osrm',
        serviceName: 'OSRM',
        timeoutMs: config.timeoutMs,
        fallbackMessage: 'OSRM routing service is temporarily unavailable',
        retryAfter: '30s',
      }
    );
  }

  async getDistanceKm(origin: Coordinates, destination: Coordinates): Promise<GeoDistanceResult> {
    try {
      const distanceKm = await this.breaker.fire(origin, destination);
      return { distanceKm, degraded: false };
    } catch {
      const distanceKm = haversineDistanceKm(
        [origin[0], origin[1]],
        [destination[0], destination[1]]
      );
      return { distanceKm, degraded: true };
    }
  }

  private async fetchOsrmDistanceKm(
    origin: Coordinates,
    destination: Coordinates
  ): Promise<number> {
    const url = `${this.config.baseUrl}/route/v1/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?overview=false`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`OSRM returned ${response.status}`);
      }

      const data = (await response.json()) as OsrmRouteResponse;

      if (!data.routes?.[0]) {
        throw new Error('OSRM returned no routes');
      }

      return data.routes[0].distance / 1000;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
