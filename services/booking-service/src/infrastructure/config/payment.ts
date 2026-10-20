import type { PaymentOutcome } from '../../application/contracts/payment-gateway';

export type PaymentConfig = {
  provider: string;
  timeoutMs: number;
  defaultOutcome: PaymentOutcome;
};

const VALID_OUTCOMES: PaymentOutcome[] = ['accepted', 'rejected', 'pending'];

export function getPaymentConfig(env: NodeJS.ProcessEnv = process.env): PaymentConfig {
  return {
    provider: 'stripe-sim',
    timeoutMs: parsePositiveInt(env['PAYMENT_TIMEOUT_MS'], 3000),
    defaultOutcome: parseOutcome(env['PAYMENT_DEFAULT_OUTCOME'], 'accepted'),
  };
}

function parsePositiveInt(value: string | undefined, defaultValue: number): number {
  if (!value || value.trim() === '') return defaultValue;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return defaultValue;
  return parsed;
}

function parseOutcome(value: string | undefined, defaultValue: PaymentOutcome): PaymentOutcome {
  if (!value) return defaultValue;
  return VALID_OUTCOMES.includes(value as PaymentOutcome)
    ? (value as PaymentOutcome)
    : defaultValue;
}
