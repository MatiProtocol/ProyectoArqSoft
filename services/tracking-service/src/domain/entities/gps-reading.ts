import type { Coordinates } from '../value-objects/coordinates';

export class GpsReading {
  constructor(
    public readonly id: string,
    public readonly transferId: number,
    public readonly vehicleId: number,
    public readonly deviceId: string,
    public readonly coordinates: Coordinates,
    public readonly timestamp: string
  ) {}
}
