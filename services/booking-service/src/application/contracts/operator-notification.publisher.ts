import type { BookingRejectedEmailDeliveryFailedNotification } from './operator-notifier';

export interface OperatorNotificationPublisher {
  publishBookingRejectedEmailDeliveryFailed(
    payload: BookingRejectedEmailDeliveryFailedNotification
  ): Promise<void>;
}
