import { ErrorFactory } from '@move/errors-lib';
import { VehicleType } from '../../../domain/enums/vehicle-type';
import { parseNumericId } from '../../../domain/validate-numeric-id';

export class UpdateVehicleCommand {
  constructor(
    public readonly id: number,
    public readonly licensePlate?: string,
    public readonly type?: VehicleType,
    public readonly capacity?: number,
    public readonly available?: boolean,
    public readonly deviceId?: string,
    public readonly characteristics?: Record<string, unknown>
  ) {}

  static create(idParam: string, body: unknown): UpdateVehicleCommand {
    const id = parseNumericId(idParam, 'Vehicle');

    const { licensePlate, type, capacity, available, deviceId, characteristics } = (body ?? {}) as {
      licensePlate?: unknown;
      type?: unknown;
      capacity?: unknown;
      available?: unknown;
      deviceId?: unknown;
      characteristics?: unknown;
    };

    if (
      licensePlate !== undefined &&
      (typeof licensePlate !== 'string' || licensePlate.trim() === '')
    ) {
      throw ErrorFactory.badRequest('licensePlate cannot be empty or whitespace');
    }
    if (
      type !== undefined &&
      (typeof type !== 'string' || !Object.values(VehicleType).includes(type as VehicleType))
    ) {
      throw ErrorFactory.badRequest(
        `type must be one of: ${Object.values(VehicleType).join(', ')}`
      );
    }
    if (
      capacity !== undefined &&
      (typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity < 1)
    ) {
      throw ErrorFactory.badRequest('capacity must be an integer >= 1');
    }
    if (available !== undefined && typeof available !== 'boolean') {
      throw ErrorFactory.badRequest('available must be a boolean');
    }
    if (deviceId !== undefined && (typeof deviceId !== 'string' || deviceId.trim() === '')) {
      throw ErrorFactory.badRequest('deviceId must be a non-empty string');
    }
    if (characteristics !== undefined && !isPlainObject(characteristics)) {
      throw ErrorFactory.badRequest('characteristics must be an object');
    }

    return new UpdateVehicleCommand(
      id,
      licensePlate,
      type as VehicleType | undefined,
      capacity,
      available,
      deviceId,
      characteristics
    );
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
