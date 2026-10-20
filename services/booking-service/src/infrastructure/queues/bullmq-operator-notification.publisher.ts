import { logger } from '@move/logs-lib';
import { Queue } from 'bullmq';
import type { OperatorNotificationPublisher } from '../../application/contracts/operator-notification.publisher';
import type {
  BookingRejectedEmailDeliveryFailedNotification,
  OperatorNotification,
} from '../../application/contracts/operator-notifier';
import { getBullMqRedisConnection } from '../config/bullmq-redis';

export class BullMqOperatorNotificationPublisher implements OperatorNotificationPublisher {
  constructor(
    private readonly operatorNotificationQueue: Queue<OperatorNotification> = new Queue(
      'operator-notification',
      { connection: getBullMqRedisConnection() }
    )
  ) {}

  async publishBookingRejectedEmailDeliveryFailed(
    payload: BookingRejectedEmailDeliveryFailedNotification
  ): Promise<void> {
    await this.operatorNotificationQueue.add('notify-booking-rejected-email-failed', payload, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 500,
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

    logger.warn('Booking rejected email failure notification queued for operator', {
      bookingId: payload.bookingId,
      userId: payload.userId,
      customerEmail: payload.customerEmail,
    });
  }
}
