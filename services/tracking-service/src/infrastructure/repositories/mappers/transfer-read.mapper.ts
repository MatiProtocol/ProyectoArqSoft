import type { TransferReadDto } from '../../../application/dtos/transfer-read.dto';
import type { TransferStatus } from '../../../domain/enums/transfer-status';
import type { Coordinates } from '../../../domain/value-objects/coordinates';
import type { TransferDocument } from '../../models/transfer.model';

export function toTransferReadDto(transfer: TransferDocument): TransferReadDto {
  return {
    id: transfer._id,
    bookingId: transfer.bookingId,
    vehicleId: transfer.vehicleId,
    deviceId: transfer.deviceId,
    driverId: transfer.driverId,
    origin: transfer.origin,
    destination: transfer.destination,
    category: transfer.category,
    status: transfer.status as TransferStatus,
    vehicleLabel: transfer.vehicleLabel,
    driverName: transfer.driverName,
    hasActiveAlerts: transfer.hasActiveAlerts,
    startedAt: transfer.startedAt?.toISOString(),
    finishedAt: transfer.finishedAt?.toISOString(),
    lastPosition: toLastPosition(transfer),
  };
}

function toLastPosition(transfer: TransferDocument): TransferReadDto['lastPosition'] {
  if (!transfer.lastPosition || !transfer.lastPositionAt) return undefined;

  return {
    coordinates: transfer.lastPosition.coordinates as Coordinates,
    at: transfer.lastPositionAt.toISOString(),
  };
}
