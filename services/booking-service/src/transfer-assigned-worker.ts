import { logger } from '@move/logs-lib';
import { RecordAssignedResourcesHandler } from './application/commands/record-assigned-resources/record-assigned-resources.handler';
import { connectMongo } from './infrastructure/config/database';
import { createTransferAssignedWorker } from './infrastructure/queues/transfer-assigned.worker';
import { BookingWriteRepository } from './infrastructure/repositories/implementations/booking.write.repository';

async function main(): Promise<void> {
  await connectMongo();
  logger.info('booking-transfer-assigned-worker MongoDB connected');

  const bookingWriteRepository = new BookingWriteRepository();
  const handler = new RecordAssignedResourcesHandler(bookingWriteRepository);
  const worker = createTransferAssignedWorker(handler);

  logger.info('booking-transfer-assigned-worker ready');

  worker.on('failed', (job, err) => {
    logger.warn('booking-transfer-assigned-worker job failed', {
      jobId: job?.id,
      bookingId: job?.data.bookingId,
      transferId: job?.data.transferId,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    logger.error('booking-transfer-assigned-worker error', {
      error: err.message,
    });
  });

  async function shutdown(signal: NodeJS.Signals): Promise<void> {
    logger.info('booking-transfer-assigned-worker received shutdown signal', { signal });

    try {
      await worker.close();
      logger.info('booking-transfer-assigned-worker stopped');
      process.exit(0);
    } catch (err) {
      logger.error('booking-transfer-assigned-worker shutdown failed', {
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
}

void main();
