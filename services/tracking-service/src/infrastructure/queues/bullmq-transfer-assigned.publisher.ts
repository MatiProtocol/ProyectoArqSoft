import { logger, startQueueMetricsUpdater, wrapJobData } from '@move/logs-lib';
import { Queue } from 'bullmq';
import type {
  ITransferAssignedPublisher,
  TransferAssignedEvent,
} from '../../application/contracts/transfer-assigned.publisher';
import { getBullMqRedisConnection } from '../config/bullmq-redis';
import { QueueNames } from './queue-names';

export class BullMqTransferAssignedPublisher implements ITransferAssignedPublisher {
  constructor(
    private readonly queue: Queue<TransferAssignedEvent> = new Queue(QueueNames.TRANSFER_ASSIGNED, {
      connection: getBullMqRedisConnection(),
    })
  ) {
    startQueueMetricsUpdater(this.queue, QueueNames.TRANSFER_ASSIGNED, 30000, logger);
  }

  async publish(event: TransferAssignedEvent): Promise<void> {
    await this.queue.add(QueueNames.TRANSFER_ASSIGNED, wrapJobData(event), {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 24 * 3600, count: 5000 },
    });
  }
}
