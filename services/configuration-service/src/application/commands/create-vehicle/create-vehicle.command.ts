import { ErrorFactory } from '@move/errors-lib';
import { VehicleType } from '../../../domain/enums/vehicle-type';

export class CreateVehicleCommand {
  constructor(
    public readonly licensePlate: string,
    public readonly type: VehicleType,
    public readonly capacity: number,
    public readonly deviceId?: string,
    public readonly characteristics?: Record<string, unknown>,
    public readonly available?: boolean
  ) {}

  static create(body: unknown): CreateVehicleCommand {
    const { licensePlate, type, capacity, deviceId, characteristics, available } = (body ?? {}) as {
      licensePlate?: unknown;
      type?: unknown;
      capacity?: unknown;
      deviceId?: unknown;
      characteristics?: unknown;
      available?: unknown;
    };

    if (typeof licensePlate !== 'string' || licensePlate.trim() === '') {
      throw ErrorFactory.badRequest('licensePlate is required and cannot be empty or whitespace');
    }
    if (typeof type !== 'string' || !Object.values(VehicleType).includes(type as VehicleType)) {
      throw ErrorFactory.badRequest(
        `type must be one of: ${Object.values(VehicleType).join(', ')}`
      );
    }
    if (typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity < 1) {
      throw ErrorFactory.badRequest('capacity is required and must be an integer >= 1');
    }
    if (deviceId !== undefined && (typeof deviceId !== 'string' || deviceId.trim() === '')) {
      throw ErrorFactory.badRequest('deviceId must be a non-empty string when provided');
    }
    if (characteristics !== undefined && !isPlainObject(characteristics)) {
      throw ErrorFactory.badRequest('characteristics must be an object when provided');
    }
    if (available !== undefined && typeof available !== 'boolean') {
      throw ErrorFactory.badRequest('available must be a boolean when provided');
    }

    return new CreateVehicleCommand(
      licensePlate,
      type as VehicleType,
      capacity,
      deviceId,
      characteristics,
      available
    );
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
