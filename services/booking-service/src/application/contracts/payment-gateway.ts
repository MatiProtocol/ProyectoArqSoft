export type PaymentOutcome = 'accepted' | 'rejected' | 'pending';

export type PaymentRequest = {
  bookingId: string;
  amount: number;
  methodToken: string;
  simulateOutcome?: PaymentOutcome | 'outage';
};

export type PaymentGatewayResult = {
  outcome: PaymentOutcome;
  reference: string;
};

export interface IPaymentGateway {
  charge(request: PaymentRequest): Promise<PaymentGatewayResult>;
}
