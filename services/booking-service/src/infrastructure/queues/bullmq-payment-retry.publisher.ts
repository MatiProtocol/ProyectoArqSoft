import { logger } from '@move/logs-lib';
import { Queue } from 'bullmq';
import type {
  PaymentRetryJob,
  PaymentRetryPublisher,
} from '../../application/contracts/payment-retry.publisher';
import { getBullMqRedisConnection } from '../config/bullmq-redis';

export class BullMqPaymentRetryPublisher implements PaymentRetryPublisher {
  constructor(
    private readonly paymentRetryQueue: Queue<PaymentRetryJob> = new Queue('payment-retry', {
      connection: getBullMqRedisConnection(),
    })
  ) {}

  async publishPaymentRetry(payload: PaymentRetryJob): Promise<void> {
    await this.paymentRetryQueue.add('retry-payment', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 24 * 3600,
        count: 5000,
      },
    });

    logger.info('Payment retry queued', {
      bookingId: payload.bookingId,
      userId: payload.userId,
    });
  }
}
