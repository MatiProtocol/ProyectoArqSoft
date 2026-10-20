import type { PaymentOutcome } from '../../contracts/payment-gateway';

export type PayBookingCommand = {
  bookingId: string;
  userId: string;
  methodToken: string;
  simulateOutcome?: PaymentOutcome | 'outage';
};
