import { logger } from '@move/logs-lib';
import { getOperatorWebhookConfig } from './infrastructure/config/operator-webhook';
import { WebhookOperatorNotifier } from './infrastructure/notifications/webhook-operator-notifier';
import { createOperatorNotificationWorker } from './infrastructure/queues/operator-notification.worker';

const operatorNotifier = new WebhookOperatorNotifier(getOperatorWebhookConfig());
const operatorNotificationWorker = createOperatorNotificationWorker(operatorNotifier);

logger.info('booking-operator-worker ready');

operatorNotificationWorker.on('failed', (job, err) => {
  logger.warn('booking-operator-worker job failed', {
    jobId: job?.id,
    bookingId: job?.data.bookingId,
    error: err.message,
  });
});

operatorNotificationWorker.on('error', (err) => {
  logger.error('booking-operator-worker error', {
    error: err.message,
  });
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info('booking-operator-worker received shutdown signal', { signal });

  try {
    await operatorNotificationWorker.close();
    logger.info('booking-operator-worker stopped');
    process.exit(0);
  } catch (err) {
    logger.error('booking-operator-worker shutdown failed', {
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
