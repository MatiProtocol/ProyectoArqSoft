import type { TransferStatus } from '../enums/transfer-status';
import type { Coordinates } from '../value-objects/coordinates';

export type LastPosition = {
  coordinates: Coordinates;
  at: string;
};

export class Transfer {
  constructor(
    public readonly bookingId: string,
    public readonly vehicleId: number,
    public readonly deviceId: string,
    public readonly driverId: string,
    public readonly origin: Coordinates,
    public readonly destination: Coordinates,
    public readonly category: string | undefined,
    public readonly status: TransferStatus,
    public readonly vehicleLabel: string | undefined,
    public readonly driverName: string | undefined,
    public readonly hasActiveAlerts: boolean,
    public readonly startedAt?: string,
    public readonly finishedAt?: string,
    public readonly lastPosition?: LastPosition
  ) {}
}
