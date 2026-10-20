import type { ITransferReadRepository } from '../../contracts/transfer.read.repository';
import type { TransferReadDto } from '../../dtos/transfer-read.dto';
import type { ListActiveTransfersQuery } from './list-active-transfers.query';

export class ListActiveTransfersHandler {
  constructor(private readonly transferReadRepository: ITransferReadRepository) {}

  async execute(query: ListActiveTransfersQuery): Promise<TransferReadDto[]> {
    return this.transferReadRepository.getActive({
      vehicleId: query.vehicleId,
      driverId: query.driverId,
      category: query.category,
      hasActiveAlerts: query.hasActiveAlerts,
      limit: query.limit,
      skip: query.skip,
    });
  }
}
