import type { ItemSize } from '../../domain/enums/item-size';
import type { Coordinates } from '../../domain/value-objects/coordinates';

export type PendingClassificationNotification = {
  bookingId: string;
  userId: string;
  origin: Coordinates;
  destination: Coordinates;
  date: string;
  status: 'pending_classification';
  items: Array<{
    id: string;
    description: string;
    value?: string;
    size?: ItemSize;
  }>;
};

export type BookingRejectedEmailDeliveryFailedNotification = {
  bookingId: string;
  userId: string;
  status: 'booking_rejected_email_delivery_failed';
  customerEmail: string;
  emailSubject: string;
  emailBodyText: string;
  itemDescriptions: string[];
  failureReason: string;
  failedAt: string;
  operatorAction: string;
};

export type OperatorNotification =
  | PendingClassificationNotification
  | BookingRejectedEmailDeliveryFailedNotification;

export interface OperatorNotifier {
  notifyPendingClassification(payload: PendingClassificationNotification): Promise<void>;
  notifyBookingRejectedEmailDeliveryFailed(
    payload: BookingRejectedEmailDeliveryFailedNotification
  ): Promise<void>;
}
