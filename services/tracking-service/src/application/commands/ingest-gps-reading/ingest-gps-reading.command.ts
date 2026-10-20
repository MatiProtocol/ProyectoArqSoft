import { ErrorFactory } from '@move/errors-lib';
import { type Coordinates, isValidCoordinates } from '../../../domain/value-objects/coordinates';

export class IngestGpsReadingCommand {
  constructor(
    public readonly transferId: number,
    public readonly vehicleId: number,
    public readonly deviceId: string,
    public readonly coordinates: Coordinates,
    public readonly timestamp: string
  ) {}

  static create(body: unknown): IngestGpsReadingCommand {
    const data = (body ?? {}) as Record<string, unknown>;

    const transferId = Number(data.transferId);
    if (!Number.isInteger(transferId) || transferId <= 0) {
      throw ErrorFactory.badRequest('transferId must be a positive integer');
    }

    const vehicleId = Number(data.vehicleId);
    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      throw ErrorFactory.badRequest('vehicleId must be a positive integer');
    }

    const deviceId = data.deviceId;
    if (typeof deviceId !== 'string' || deviceId.trim() === '') {
      throw ErrorFactory.badRequest('deviceId is required');
    }

    if (!isValidCoordinates(data.coordinates)) {
      throw ErrorFactory.badRequest('coordinates must be [lng, lat] within valid ranges');
    }

    const timestamp = normalizeTimestamp(data.timestamp);

    return new IngestGpsReadingCommand(
      transferId,
      vehicleId,
      deviceId.trim(),
      data.coordinates,
      timestamp
    );
  }
}

function normalizeTimestamp(value: unknown): string {
  if (value === undefined || value === null) {
    return new Date().toISOString();
  }

  const date = new Date(value as string | number);
  if (Number.isNaN(date.getTime())) {
    throw ErrorFactory.badRequest('timestamp must be a valid date');
  }

  return date.toISOString();
}
