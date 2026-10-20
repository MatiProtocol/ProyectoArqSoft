import type { Coordinates } from '../../domain/value-objects/coordinates';

export type RedZoneMatch = {
  id: number;
  name: string;
};

export interface IZoneReadRepository {
  findRedZonesContaining(coordinates: Coordinates): Promise<RedZoneMatch[]>;
}
