import { logger } from '@move/logs-lib';
import { Queue } from 'bullmq';
import type { PendingClassificationNotification } from '../../application/contracts/operator-notifier';
import type { PendingClassificationPublisher } from '../../application/contracts/pending-classification.publisher';
import { getBullMqRedisConnection } from '../config/bullmq-redis';
import type { ManualClassificationJobData } from './manual-classification-job.data';

export class BullMqPendingClassificationPublisher implements PendingClassificationPublisher {
  constructor(
    private readonly manualClassificationQueue: Queue<ManualClassificationJobData> = new Queue(
      'manual-classification',
      { connection: getBullMqRedisConnection() }
    ),
    private readonly operatorNotificationQueue: Queue<PendingClassificationNotification> = new Queue(
      'operator-notification',
      { connection: getBullMqRedisConnection() }
    )
  ) {}

  async publishPendingClassification(payload: PendingClassificationNotification): Promise<void> {
    await this.manualClassificationQueue.add(
      'review-pending-classification',
      {
        ...payload,
        queuedAt: new Date().toISOString(),
      },
      {
        jobId: payload.bookingId,
        removeOnComplete: false,
        removeOnFail: false,
      }
    );

    await this.operatorNotificationQueue.add('notify-pending-classification', payload, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 500,
      },
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 24 * 3600,
        count: 5000,
      },
    });

    logger.info('Pending classification jobs queued', {
      bookingId: payload.bookingId,
      userId: payload.userId,
      itemCount: payload.items.length,
    });
  }
}
