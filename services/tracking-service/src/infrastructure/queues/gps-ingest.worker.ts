import { createWrapProcessor, generateCorrelationId, logger, runWithContext } from '@move/logs-lib';
import { type Job, Worker } from 'bullmq';
import { RecordGpsReadingCommand } from '../../application/commands/record-gps-reading/record-gps-reading.command';
import type { RecordGpsReadingHandler } from '../../application/commands/record-gps-reading/record-gps-reading.handler';
import type { GpsReadingJob } from '../../application/contracts/gps-ingest.publisher';
import { getBullMqRedisConnection } from '../config/bullmq-redis';
import { QueueNames } from './queue-names';

export function createGpsIngestWorker(handler: RecordGpsReadingHandler): Worker<GpsReadingJob> {
  const wrapProcessor = createWrapProcessor(logger, { runWithContext, generateCorrelationId });

  return new Worker<GpsReadingJob>(
    QueueNames.GPS_INGEST,
    wrapProcessor(async (job: Job<GpsReadingJob>) => {
      const { transferId, vehicleId, deviceId, coordinates, timestamp } = job.data;
      await handler.execute(
        new RecordGpsReadingCommand(transferId, vehicleId, deviceId, coordinates, timestamp)
      );
    }),
    { connection: getBullMqRedisConnection() }
  );
}
