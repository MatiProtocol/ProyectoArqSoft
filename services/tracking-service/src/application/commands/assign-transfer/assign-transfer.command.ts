import { ErrorFactory } from '@move/errors-lib';

export class AssignTransferCommand {
  constructor(
    public readonly bookingId: string,
    public readonly vehicleId: number,
    public readonly driverId: string,
    public readonly driverName?: string
  ) {}

  static create(body: unknown): AssignTransferCommand {
    const data = (body ?? {}) as Record<string, unknown>;

    const bookingId = data.bookingId;
    if (typeof bookingId !== 'string' || bookingId.trim() === '') {
      throw ErrorFactory.badRequest('bookingId is required');
    }

    const vehicleId = Number(data.vehicleId);
    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      throw ErrorFactory.badRequest('vehicleId must be a positive integer');
    }

    const driverId = data.driverId;
    if (typeof driverId !== 'string' || driverId.trim() === '') {
      throw ErrorFactory.badRequest('driverId is required');
    }

    const driverName =
      typeof data.driverName === 'string' && data.driverName.trim() !== ''
        ? data.driverName.trim()
        : undefined;

    return new AssignTransferCommand(bookingId.trim(), vehicleId, driverId.trim(), driverName);
  }
}
