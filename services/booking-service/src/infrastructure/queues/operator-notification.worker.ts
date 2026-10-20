import { type Job, Worker } from 'bullmq';
import type {
  OperatorNotification,
  OperatorNotifier,
} from '../../application/contracts/operator-notifier';
import { getBullMqRedisConnection } from '../config/bullmq-redis';

export function createOperatorNotificationWorker(
  operatorNotifier: OperatorNotifier
): Worker<OperatorNotification> {
  return new Worker<OperatorNotification>(
    'operator-notification',
    async (job: Job<OperatorNotification>) => {
      if (job.data.status === 'booking_rejected_email_delivery_failed') {
        await operatorNotifier.notifyBookingRejectedEmailDeliveryFailed(job.data);
        return;
      }

      await operatorNotifier.notifyPendingClassification(job.data);
    },
    { connection: getBullMqRedisConnection() }
  );
}
