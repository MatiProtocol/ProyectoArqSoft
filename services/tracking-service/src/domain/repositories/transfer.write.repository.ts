import type { Transfer } from '../entities/transfer';
import type { TransferStatus } from '../enums/transfer-status';
import type { Coordinates } from '../value-objects/coordinates';

export interface ITransferWriteRepository {
  create(transfer: Transfer): Promise<number>;
  updateStatus(
    id: number,
    status: TransferStatus,
    timestamps: { startedAt?: string; finishedAt?: string }
  ): Promise<void>;
  updateLastPosition(id: number, coordinates: Coordinates, at: string): Promise<void>;
  markHasActiveAlerts(id: number, hasActiveAlerts: boolean): Promise<void>;
}
