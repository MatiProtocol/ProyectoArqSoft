import type { Coordinates } from '../../domain/value-objects/coordinates';

export type PositionReadDto = {
  coordinates: Coordinates;
  timestamp: string;
};
