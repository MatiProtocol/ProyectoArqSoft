import { logger } from '@move/logs-lib';
import { type Job, Worker } from 'bullmq';
import type {
  BookingRejectedEmail,
  CustomerEmailNotifier,
} from '../../application/contracts/customer-email-notifier';
import type { OperatorNotificationPublisher } from '../../application/contracts/operator-notification.publisher';
import { getBullMqRedisConnection } from '../config/bullmq-redis';

export function createCustomerEmailWorker(
  customerEmailNotifier: CustomerEmailNotifier,
  operatorNotificationPublisher?: OperatorNotificationPublisher
): Worker<BookingRejectedEmail> {
  return new Worker<BookingRejectedEmail>(
    'customer-email',
    async (job: Job<BookingRejectedEmail>) => {
      try {
        await customerEmailNotifier.notifyBookingRejected(job.data);
      } catch (error) {
        if (operatorNotificationPublisher && isFinalAttempt(job)) {
          await operatorNotificationPublisher
            .publishBookingRejectedEmailDeliveryFailed({
              bookingId: job.data.bookingId,
              userId: job.data.userId,
              status: 'booking_rejected_email_delivery_failed',
              customerEmail: job.data.to,
              emailSubject: job.data.subject,
              emailBodyText: job.data.bodyText,
              itemDescriptions: job.data.itemDescriptions,
              failureReason: error instanceof Error ? error.message : String(error),
              failedAt: new Date().toISOString(),
              operatorAction:
                'Enviar manualmente este correo al cliente usando customerEmail, emailSubject y emailBodyText.',
            })
            .catch((publishError: unknown) => {
              logger.warn('Operator notification could not be queued after email failure', {
                bookingId: job.data.bookingId,
                userId: job.data.userId,
                error: publishError instanceof Error ? publishError.message : String(publishError),
              });
            });
        }

        throw error;
      }
    },
    { connection: getBullMqRedisConnection() }
  );
}

function isFinalAttempt(job: Job<BookingRejectedEmail>): boolean {
  const maxAttempts = job.opts.attempts ?? 1;
  const currentAttempt = job.attemptsMade + 1;

  return currentAttempt >= maxAttempts;
}
