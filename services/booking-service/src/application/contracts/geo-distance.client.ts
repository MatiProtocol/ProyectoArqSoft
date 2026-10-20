import type { Coordinates } from '../../domain/value-objects/coordinates';

export type GeoDistanceResult = {
  distanceKm: number;
  degraded: boolean;
};

export interface IGeoDistanceClient {
  getDistanceKm(origin: Coordinates, destination: Coordinates): Promise<GeoDistanceResult>;
}
