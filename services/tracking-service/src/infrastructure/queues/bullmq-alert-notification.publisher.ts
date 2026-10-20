import { logger, startQueueMetricsUpdater, wrapJobData } from '@move/logs-lib';
import { Queue } from 'bullmq';
import type { IAlertNotificationPublisher } from '../../application/contracts/alert-notification.publisher';
import type { AlertNotification } from '../../application/contracts/operator-notifier';
import { getBullMqRedisConnection } from '../config/bullmq-redis';
import { QueueNames } from './queue-names';

export class BullMqAlertNotificationPublisher implements IAlertNotificationPublisher {
  constructor(
    private readonly queue: Queue<AlertNotification> = new Queue(QueueNames.NOTIFICATION, {
      connection: getBullMqRedisConnection(),
    })
  ) {
    startQueueMetricsUpdater(this.queue, QueueNames.NOTIFICATION, 30000, logger);
  }

  async publish(payload: AlertNotification): Promise<void> {
    await this.queue.add(QueueNames.NOTIFICATION, wrapJobData(payload), {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 24 * 3600, count: 5000 },
    });
  }
}
