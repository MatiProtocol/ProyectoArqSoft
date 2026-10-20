import { createWrapProcessor, generateCorrelationId, logger, runWithContext } from '@move/logs-lib';
import { type Job, Worker } from 'bullmq';
import type {
  AlertNotification,
  OperatorNotifier,
} from '../../application/contracts/operator-notifier';
import { getBullMqRedisConnection } from '../config/bullmq-redis';
import { QueueNames } from './queue-names';

export function createNotificationWorker(
  operatorNotifier: OperatorNotifier
): Worker<AlertNotification> {
  const wrapProcessor = createWrapProcessor(logger, { runWithContext, generateCorrelationId });

  return new Worker<AlertNotification>(
    QueueNames.NOTIFICATION,
    wrapProcessor(async (job: Job<AlertNotification>) => {
      await operatorNotifier.notifyAlert(job.data);
    }),
    { connection: getBullMqRedisConnection() }
  );
}
