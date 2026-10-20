import { logger } from '@move/logs-lib';
import { getOperatorWebhookConfig } from './infrastructure/config/operator-webhook';
import { WebhookOperatorNotifier } from './infrastructure/notifications/webhook-operator-notifier';
import { createNotificationWorker } from './infrastructure/queues/notification.worker';

const operatorNotifier = new WebhookOperatorNotifier(getOperatorWebhookConfig());
const notificationWorker = createNotificationWorker(operatorNotifier);

logger.info('tracking-notification-worker ready');

notificationWorker.on('failed', (job, err) => {
  logger.warn('tracking-notification-worker job failed', {
    jobId: job?.id,
    alertId: job?.data.alertId,
    error: err.message,
  });
});

notificationWorker.on('error', (err) => {
  logger.error('tracking-notification-worker error', { error: err.message });
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info('tracking-notification-worker received shutdown signal', { signal });

  try {
    await notificationWorker.close();
    logger.info('tracking-notification-worker stopped');
    process.exit(0);
  } catch (err) {
    logger.error('tracking-notification-worker shutdown failed', {
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
