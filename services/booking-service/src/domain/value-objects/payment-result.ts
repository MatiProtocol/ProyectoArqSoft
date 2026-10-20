import type { PaymentStatus } from '../enums/payment-status';

export type PaymentResult = {
  status: PaymentStatus;
  amount: number;
  provider: string;
  reference?: string;
  reason?: string;
  attempts: number;
  paidAt?: string;
  updatedAt: string;
};
