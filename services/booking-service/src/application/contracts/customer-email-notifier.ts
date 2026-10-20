export type BookingRejectedEmail = {
  bookingId: string;
  userId: string;
  to: string;
  subject: string;
  bodyText: string;
  itemDescriptions: string[];
};

export interface CustomerEmailNotifier {
  notifyBookingRejected(payload: BookingRejectedEmail): Promise<void>;
}
