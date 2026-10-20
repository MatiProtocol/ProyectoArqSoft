import type { BookingRejectedEmail } from './customer-email-notifier';

export interface CustomerEmailPublisher {
  publishBookingRejected(payload: BookingRejectedEmail): Promise<void>;
}
