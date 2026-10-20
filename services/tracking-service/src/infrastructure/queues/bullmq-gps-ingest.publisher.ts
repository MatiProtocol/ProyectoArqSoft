import { logger, startQueueMetricsUpdater, wrapJobData } from '@move/logs-lib';
import { Queue } from 'bullmq';
import type {
  GpsReadingJob,
  IGpsIngestPublisher,
} from '../../application/contracts/gps-ingest.publisher';
import { getBullMqRedisConnection } from '../config/bullmq-redis';
import { QueueNames } from './queue-names';

export class BullMqGpsIngestPublisher implements IGpsIngestPublisher {
  constructor(
    private readonly queue: Queue<GpsReadingJob> = new Queue(QueueNames.GPS_INGEST, {
      connection: getBullMqRedisConnection(),
    })
  ) {
    startQueueMetricsUpdater(this.queue, QueueNames.GPS_INGEST, 30000, logger);
  }

  async publish(job: GpsReadingJob): Promise<void> {
    await this.queue.add(QueueNames.GPS_INGEST, wrapJobData(job), {
      removeOnComplete: true,
      removeOnFail: { age: 3600, count: 1000 },
    });
  }
}
