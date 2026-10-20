import { logger } from '@move/logs-lib';
import type { Worker } from 'bullmq';
import { RecordGpsReadingHandler } from './application/commands/record-gps-reading/record-gps-reading.handler';
import { connectMongo } from './infrastructure/config/database';
import { BullMqAlertDetectionPublisher } from './infrastructure/queues/bullmq-alert-detection.publisher';
import { createGpsIngestWorker } from './infrastructure/queues/gps-ingest.worker';
import { GpsReadingWriteRepository } from './infrastructure/repositories/implementations/gps-reading.write.repository';
import { TransferWriteRepository } from './infrastructure/repositories/implementations/transfer.write.repository';

let worker: Worker | undefined;

async function bootstrap(): Promise<void> {
  await connectMongo();
  logger.info('tracking-gps-worker MongoDB connected');

  const handler = new RecordGpsReadingHandler(
    new GpsReadingWriteRepository(),
    new TransferWriteRepository(),
    new BullMqAlertDetectionPublisher()
  );

  worker = createGpsIngestWorker(handler);

  worker.on('failed', (job, err) => {
    logger.warn('tracking-gps-worker job failed', {
      jobId: job?.id,
      transferId: job?.data.transferId,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    logger.error('tracking-gps-worker error', { error: err.message });
  });

  logger.info('tracking-gps-worker ready');
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info('tracking-gps-worker received shutdown signal', { signal });

  try {
    await worker?.close();
    logger.info('tracking-gps-worker stopped');
    process.exit(0);
  } catch (err) {
    logger.error('tracking-gps-worker shutdown failed', {
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
  logger.error('tracking-gps-worker failed to start', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
