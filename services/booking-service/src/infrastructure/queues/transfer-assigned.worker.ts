import { type Job, Worker } from 'bullmq';
import { RecordAssignedResourcesCommand } from '../../application/commands/record-assigned-resources/record-assigned-resources.command';
import type { RecordAssignedResourcesHandler } from '../../application/commands/record-assigned-resources/record-assigned-resources.handler';
import type { TransferAssignedEvent } from '../../application/contracts/transfer-assigned.event';
import { getBullMqRedisConnection } from '../config/bullmq-redis';

export const TRANSFER_ASSIGNED_QUEUE = 'transfer-assigned';

export function createTransferAssignedWorker(
  handler: RecordAssignedResourcesHandler
): Worker<TransferAssignedEvent> {
  return new Worker<TransferAssignedEvent>(
    TRANSFER_ASSIGNED_QUEUE,
    async (job: Job<TransferAssignedEvent>) => {
      await handler.execute(RecordAssignedResourcesCommand.create(job.data));
    },
    { connection: getBullMqRedisConnection() }
  );
}
