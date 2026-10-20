import { logger } from '@move/logs-lib';
import { type Job, Worker } from 'bullmq';
import type { PayBookingHandler } from '../../application/commands/pay-booking/pay-booking.handler';
import type { PaymentRetryJob } from '../../application/contracts/payment-retry.publisher';
import { getBullMqRedisConnection } from '../config/bullmq-redis';

export function createPaymentRetryWorker(
  payBookingHandler: PayBookingHandler
): Worker<PaymentRetryJob> {
  return new Worker<PaymentRetryJob>(
    'payment-retry',
    async (job: Job<PaymentRetryJob>) => {
      try {
        await payBookingHandler.execute({
          bookingId: job.data.bookingId,
          userId: job.data.userId,
          methodToken: job.data.methodToken,
        });
      } catch (error) {
        if (isFinalAttempt(job)) {
          logger.error('Payment retry exhausted, booking remains pending payment', {
            bookingId: job.data.bookingId,
            userId: job.data.userId,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        throw error;
      }
    },
    { connection: getBullMqRedisConnection() }
  );
}

function isFinalAttempt(job: Job<PaymentRetryJob>): boolean {
  const maxAttempts = job.opts.attempts ?? 1;
  const currentAttempt = job.attemptsMade + 1;

  return currentAttempt >= maxAttempts;
}
