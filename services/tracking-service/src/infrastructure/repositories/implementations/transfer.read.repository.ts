import type {
  ActiveTransferFilter,
  ITransferReadRepository,
} from '../../../application/contracts/transfer.read.repository';
import type { TransferReadDto } from '../../../application/dtos/transfer-read.dto';
import { TransferStatus } from '../../../domain/enums/transfer-status';
import { TransferModel } from '../../models/transfer.model';
import { toTransferReadDto } from '../mappers/transfer-read.mapper';

const ACTIVE_STATUSES = [TransferStatus.ASSIGNED, TransferStatus.IN_PROGRESS];
const DEFAULT_LIMIT = 50;

type TransferQuery = {
  status: { $in: TransferStatus[] };
  vehicleId?: number;
  driverId?: string;
  category?: string;
  hasActiveAlerts?: boolean;
};

export class TransferReadRepository implements ITransferReadRepository {
  async findById(id: number): Promise<TransferReadDto | null> {
    const transfer = await TransferModel.findById(id).lean();
    if (!transfer) return null;

    return toTransferReadDto(transfer);
  }

  async getActive(filter: ActiveTransferFilter): Promise<TransferReadDto[]> {
    const query: TransferQuery = { status: { $in: ACTIVE_STATUSES } };
    if (filter.vehicleId !== undefined) query.vehicleId = filter.vehicleId;
    if (filter.driverId !== undefined) query.driverId = filter.driverId;
    if (filter.category !== undefined) query.category = filter.category;
    if (filter.hasActiveAlerts !== undefined) query.hasActiveAlerts = filter.hasActiveAlerts;

    const limit = filter.limit ?? DEFAULT_LIMIT;
    const skip = filter.skip ?? 0;

    const transfers = await TransferModel.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return transfers.map((transfer) => toTransferReadDto(transfer));
  }

  async existsActiveForVehicle(vehicleId: number): Promise<boolean> {
    const existing = await TransferModel.exists({
      vehicleId,
      status: { $in: ACTIVE_STATUSES },
    });

    return existing !== null;
  }
}
