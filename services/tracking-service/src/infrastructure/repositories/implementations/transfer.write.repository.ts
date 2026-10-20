import { ErrorFactory } from '@move/errors-lib';
import { MongoServerError } from 'mongodb';
import type { Transfer } from '../../../domain/entities/transfer';
import type { TransferStatus } from '../../../domain/enums/transfer-status';
import type { ITransferWriteRepository } from '../../../domain/repositories/transfer.write.repository';
import type { Coordinates } from '../../../domain/value-objects/coordinates';
import { TransferModel } from '../../models/transfer.model';

const MAX_ID_GENERATION_ATTEMPTS = 5;

export class TransferWriteRepository implements ITransferWriteRepository {
  async create(transfer: Transfer): Promise<number> {
    for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt++) {
      const nextId = await this.nextId();
      const transferDocument = new TransferModel({
        _id: nextId,
        bookingId: transfer.bookingId,
        vehicleId: transfer.vehicleId,
        deviceId: transfer.deviceId,
        driverId: transfer.driverId,
        origin: transfer.origin,
        destination: transfer.destination,
        category: transfer.category,
        status: transfer.status,
        vehicleLabel: transfer.vehicleLabel,
        driverName: transfer.driverName,
        hasActiveAlerts: transfer.hasActiveAlerts,
      });

      try {
        await transferDocument.save();
        return nextId;
      } catch (error) {
        if (error instanceof MongoServerError && error.code === 11000 && error.keyPattern?._id) {
          continue;
        }
        throw error;
      }
    }

    throw ErrorFactory.conflict('Could not assign a unique id for the new transfer, please retry.');
  }

  async updateStatus(
    id: number,
    status: TransferStatus,
    timestamps: { startedAt?: string; finishedAt?: string }
  ): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (timestamps.startedAt) update.startedAt = new Date(timestamps.startedAt);
    if (timestamps.finishedAt) update.finishedAt = new Date(timestamps.finishedAt);

    await TransferModel.updateOne({ _id: id }, { $set: update });
  }

  async updateLastPosition(id: number, coordinates: Coordinates, at: string): Promise<void> {
    await TransferModel.updateOne(
      { _id: id },
      {
        $set: {
          lastPosition: { type: 'Point', coordinates },
          lastPositionAt: new Date(at),
        },
      }
    );
  }

  async markHasActiveAlerts(id: number, hasActiveAlerts: boolean): Promise<void> {
    await TransferModel.updateOne({ _id: id }, { $set: { hasActiveAlerts } });
  }

  private async nextId(): Promise<number> {
    const last = await TransferModel.findOne().sort({ _id: -1 }).select('_id').lean();
    return (last?._id ?? 0) + 1;
  }
}
