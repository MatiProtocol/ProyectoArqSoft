import { logger } from '@move/logs-lib';
import { Queue } from 'bullmq';
import type { CustomerEmailPublisher } from '../../application/contracts/customer-email.publisher';
import type { BookingRejectedEmail } from '../../application/contracts/customer-email-notifier';
import { getBullMqRedisConnection } from '../config/bullmq-redis';

export class BullMqCustomerEmailPublisher implements CustomerEmailPublisher {
  constructor(
    private readonly customerEmailQueue: Queue<BookingRejectedEmail> = new Queue('customer-email', {
      connection: getBullMqRedisConnection(),
    })
  ) {}

  async publishBookingRejected(payload: BookingRejectedEmail): Promise<void> {
    await this.customerEmailQueue.add('notify-booking-rejected', payload, {
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

    logger.info('Booking rejection email queued', {
      bookingId: payload.bookingId,
      userId: payload.userId,
    });
  }
}
