import type { Coordinates } from '../../../domain/value-objects/coordinates';

export class DetectSituationsCommand {
  constructor(
    public readonly gpsReadingId: string,
    public readonly transferId: number,
    public readonly vehicleId: number,
    public readonly deviceId: string,
    public readonly coordinates: Coordinates,
    public readonly timestamp: string
  ) {}
}
