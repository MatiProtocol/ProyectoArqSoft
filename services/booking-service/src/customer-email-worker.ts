import { logger } from '@move/logs-lib';
import { getGmailConfig } from './infrastructure/config/gmail';
import { GmailCustomerEmailNotifier } from './infrastructure/notifications/gmail-customer-email-notifier';
import { BullMqOperatorNotificationPublisher } from './infrastructure/queues/bullmq-operator-notification.publisher';
import { createCustomerEmailWorker } from './infrastructure/queues/customer-email.worker';

const customerEmailNotifier = new GmailCustomerEmailNotifier(getGmailConfig());
const operatorNotificationPublisher = new BullMqOperatorNotificationPublisher();
const customerEmailWorker = createCustomerEmailWorker(
  customerEmailNotifier,
  operatorNotificationPublisher
);

logger.info('booking-customer-email-worker ready');

customerEmailWorker.on('failed', (job, err) => {
  logger.warn('booking-customer-email-worker job failed', {
    jobId: job?.id,
    bookingId: job?.data.bookingId,
    userId: job?.data.userId,
    error: err.message,
  });
});

customerEmailWorker.on('error', (err) => {
  logger.error('booking-customer-email-worker error', {
    error: err.message,
  });
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info('booking-customer-email-worker received shutdown signal', { signal });

  try {
    await customerEmailWorker.close();
    logger.info('booking-customer-email-worker stopped');
    process.exit(0);
  } catch (err) {
    logger.error('booking-customer-email-worker shutdown failed', {
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
