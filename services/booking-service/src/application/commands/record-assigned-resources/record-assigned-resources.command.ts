import { ErrorFactory } from '@move/errors-lib';
import type { TransferAssignedEvent } from '../../contracts/transfer-assigned.event';

export class RecordAssignedResourcesCommand {
  constructor(public readonly event: TransferAssignedEvent) {}

  static create(data: unknown): RecordAssignedResourcesCommand {
    const event = data as Partial<TransferAssignedEvent>;

    if (typeof event.bookingId !== 'string' || event.bookingId.trim() === '') {
      throw ErrorFactory.badRequest('bookingId is required');
    }

    const transferId = Number(event.transferId);
    if (!Number.isInteger(transferId) || transferId <= 0) {
      throw ErrorFactory.badRequest('transferId must be a positive integer');
    }

    const vehicleId = Number(event.vehicleId);
    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      throw ErrorFactory.badRequest('vehicleId must be a positive integer');
    }

    if (typeof event.deviceId !== 'string' || event.deviceId.trim() === '') {
      throw ErrorFactory.badRequest('deviceId is required');
    }

    if (typeof event.driverId !== 'string' || event.driverId.trim() === '') {
      throw ErrorFactory.badRequest('driverId is required');
    }

    if (typeof event.assignedAt !== 'string' || event.assignedAt.trim() === '') {
      throw ErrorFactory.badRequest('assignedAt is required');
    }

    return new RecordAssignedResourcesCommand({
      bookingId: event.bookingId.trim(),
      transferId,
      vehicleId,
      deviceId: event.deviceId.trim(),
      driverId: event.driverId.trim(),
      vehicleLabel: event.vehicleLabel,
      driverName: event.driverName,
      status: 'assigned',
      assignedAt: event.assignedAt.trim(),
    });
  }
}
