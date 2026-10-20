import { logger, startQueueMetricsUpdater, wrapJobData } from '@move/logs-lib';
import { Queue } from 'bullmq';
import type {
  AlertDetectionJob,
  IAlertDetectionPublisher,
} from '../../application/contracts/alert-detection.publisher';
import { getBullMqRedisConnection } from '../config/bullmq-redis';
import { QueueNames } from './queue-names';

export class BullMqAlertDetectionPublisher implements IAlertDetectionPublisher {
  constructor(
    private readonly queue: Queue<AlertDetectionJob> = new Queue(QueueNames.ALERT_DETECTION, {
      connection: getBullMqRedisConnection(),
    })
  ) {
    startQueueMetricsUpdater(this.queue, QueueNames.ALERT_DETECTION, 30000, logger);
  }

  async publish(job: AlertDetectionJob): Promise<void> {
    await this.queue.add(QueueNames.ALERT_DETECTION, wrapJobData(job), {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 24 * 3600, count: 5000 },
    });
  }
}
