export type PaymentRetryJob = {
  bookingId: string;
  userId: string;
  methodToken: string;
};

export interface PaymentRetryPublisher {
  publishPaymentRetry(payload: PaymentRetryJob): Promise<void>;
}
