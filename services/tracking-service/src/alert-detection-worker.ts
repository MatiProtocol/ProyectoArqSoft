import { logger } from '@move/logs-lib';
import type { Worker } from 'bullmq';
import { DetectSituationsHandler } from './application/commands/detect-situations/detect-situations.handler';
import { getProlongedStopThresholds } from './infrastructure/config/alert-thresholds';
import { connectMongo } from './infrastructure/config/database';
import { createAlertDetectionWorker } from './infrastructure/queues/alert-detection.worker';
import { BullMqAlertNotificationPublisher } from './infrastructure/queues/bullmq-alert-notification.publisher';
import { AlertWriteRepository } from './infrastructure/repositories/implementations/alert.write.repository';
import { GpsReadingReadRepository } from './infrastructure/repositories/implementations/gps-reading.read.repository';
import { TransferWriteRepository } from './infrastructure/repositories/implementations/transfer.write.repository';
import { ZoneReadRepository } from './infrastructure/repositories/implementations/zone.read.repository';

let worker: Worker | undefined;

async function bootstrap(): Promise<void> {
  await connectMongo();
  logger.info('tracking-alert-worker MongoDB connected');

  const handler = new DetectSituationsHandler(
    new ZoneReadRepository(),
    new GpsReadingReadRepository(),
    new AlertWriteRepository(),
    new TransferWriteRepository(),
    new BullMqAlertNotificationPublisher(),
    getProlongedStopThresholds()
  );

  worker = createAlertDetectionWorker(handler);

  worker.on('failed', (job, err) => {
    logger.warn('tracking-alert-worker job failed', {
      jobId: job?.id,
      transferId: job?.data.transferId,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    logger.error('tracking-alert-worker error', { error: err.message });
  });

  logger.info('tracking-alert-worker ready');
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info('tracking-alert-worker received shutdown signal', { signal });

  try {
    await worker?.close();
    logger.info('tracking-alert-worker stopped');
    process.exit(0);
  } catch (err) {
    logger.error('tracking-alert-worker shutdown failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});

process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

void bootstrap().catch((err: unknown) => {
  logger.error('tracking-alert-worker failed to start', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
