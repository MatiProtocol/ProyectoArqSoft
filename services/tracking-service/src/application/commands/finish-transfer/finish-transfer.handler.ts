import { ErrorFactory } from '@move/errors-lib';
import { logger } from '@move/logs-lib';
import { TransferStatus } from '../../../domain/enums/transfer-status';
import type { ITransferWriteRepository } from '../../../domain/repositories/transfer.write.repository';
import type { ITransferReadRepository } from '../../contracts/transfer.read.repository';
import type { FinishTransferCommand } from './finish-transfer.command';

export class FinishTransferHandler {
  constructor(
    private readonly transferReadRepository: ITransferReadRepository,
    private readonly transferWriteRepository: ITransferWriteRepository
  ) {}

  async execute(command: FinishTransferCommand): Promise<void> {
    const transfer = await this.transferReadRepository.findById(command.transferId);
    if (!transfer) {
      throw ErrorFactory.notFound('Transfer', command.transferId);
    }

    if (transfer.driverId !== command.driverId) {
      throw ErrorFactory.forbidden('Driver is not assigned to this transfer');
    }

    if (transfer.status !== TransferStatus.IN_PROGRESS) {
      throw ErrorFactory.conflict(`Transfer cannot be finished from status '${transfer.status}'`);
    }

    await this.transferWriteRepository.updateStatus(transfer.id, TransferStatus.COMPLETED, {
      finishedAt: new Date().toISOString(),
    });

    logger.info('Transfer finished', {
      transferId: transfer.id,
      driverId: command.driverId,
      vehicleId: transfer.vehicleId,
    });
  }
}
