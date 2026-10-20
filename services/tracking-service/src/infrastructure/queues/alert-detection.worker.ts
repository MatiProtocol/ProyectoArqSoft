import { createWrapProcessor, generateCorrelationId, logger, runWithContext } from '@move/logs-lib';
import { type Job, Worker } from 'bullmq';
import { DetectSituationsCommand } from '../../application/commands/detect-situations/detect-situations.command';
import type { DetectSituationsHandler } from '../../application/commands/detect-situations/detect-situations.handler';
import type { AlertDetectionJob } from '../../application/contracts/alert-detection.publisher';
import { getBullMqRedisConnection } from '../config/bullmq-redis';
import { QueueNames } from './queue-names';

export function createAlertDetectionWorker(
  handler: DetectSituationsHandler
): Worker<AlertDetectionJob> {
  const wrapProcessor = createWrapProcessor(logger, { runWithContext, generateCorrelationId });

  return new Worker<AlertDetectionJob>(
    QueueNames.ALERT_DETECTION,
    wrapProcessor(async (job: Job<AlertDetectionJob>) => {
      const { gpsReadingId, transferId, vehicleId, deviceId, coordinates, timestamp } = job.data;
      await handler.execute(
        new DetectSituationsCommand(
          gpsReadingId,
          transferId,
          vehicleId,
          deviceId,
          coordinates,
          timestamp
        )
      );
    }),
    { connection: getBullMqRedisConnection() }
  );
}
