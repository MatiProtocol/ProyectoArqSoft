import type { TransferStatus } from '../../domain/enums/transfer-status';
import type { Coordinates } from '../../domain/value-objects/coordinates';

export type TransferReadDto = {
  id: number;
  bookingId: string;
  vehicleId: number;
  deviceId: string;
  driverId: string;
  origin: Coordinates;
  destination: Coordinates;
  category?: string;
  status: TransferStatus;
  vehicleLabel?: string;
  driverName?: string;
  hasActiveAlerts: boolean;
  startedAt?: string;
  finishedAt?: string;
  lastPosition?: {
    coordinates: Coordinates;
    at: string;
  };
};
