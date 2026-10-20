import { randomUUID } from 'node:crypto';
import type {
  IPaymentGateway,
  PaymentGatewayResult,
  PaymentRequest,
} from '../../application/contracts/payment-gateway';
import type { PaymentConfig } from '../config/payment';

export class SimulatedPaymentGateway implements IPaymentGateway {
  constructor(private readonly config: PaymentConfig) {}

  async charge(request: PaymentRequest): Promise<PaymentGatewayResult> {
    const outcome = request.simulateOutcome ?? this.config.defaultOutcome;

    if (outcome === 'outage') {
      throw new Error('Payment gateway is unavailable');
    }

    return {
      outcome,
      reference: `${this.config.provider}-${randomUUID()}`,
    };
  }
}
