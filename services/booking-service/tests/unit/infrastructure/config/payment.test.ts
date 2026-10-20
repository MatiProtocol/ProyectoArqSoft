import { getPaymentConfig } from '../../../../src/infrastructure/config/payment';

describe('getPaymentConfig', () => {
  it('should return default values when env variables are not provided', () => {
    const config = getPaymentConfig({});
    expect(config).toEqual({
      provider: 'stripe-sim',
      timeoutMs: 3000,
      defaultOutcome: 'accepted',
    });
  });

  it('should parse environment variables correctly', () => {
    const env = {
      PAYMENT_TIMEOUT_MS: '5000',
      PAYMENT_DEFAULT_OUTCOME: 'pending',
    };
    const config = getPaymentConfig(env);
    expect(config).toEqual({
      provider: 'stripe-sim',
      timeoutMs: 5000,
      defaultOutcome: 'pending',
    });
  });

  it('should use default timeout if the environment variable is invalid or negative', () => {
    const config = getPaymentConfig({ PAYMENT_TIMEOUT_MS: '-100' });
    expect(config.timeoutMs).toBe(3000);
  });

  it('should use default timeout if the value is zero, NaN or blank', () => {
    expect(getPaymentConfig({ PAYMENT_TIMEOUT_MS: '0' }).timeoutMs).toBe(3000);
    expect(getPaymentConfig({ PAYMENT_TIMEOUT_MS: 'NaN' }).timeoutMs).toBe(3000);
    expect(getPaymentConfig({ PAYMENT_TIMEOUT_MS: '   ' }).timeoutMs).toBe(3000);
  });

  it('should ignore float numbers for timeoutMs and use default', () => {
    expect(getPaymentConfig({ PAYMENT_TIMEOUT_MS: '200.5' }).timeoutMs).toBe(3000);
  });

  it('should fall back to the default outcome when the value is not a valid outcome', () => {
    expect(getPaymentConfig({ PAYMENT_DEFAULT_OUTCOME: 'outage' }).defaultOutcome).toBe('accepted');
    expect(getPaymentConfig({ PAYMENT_DEFAULT_OUTCOME: 'invalid' }).defaultOutcome).toBe(
      'accepted'
    );
  });

  it('should accept rejected and pending as valid default outcomes', () => {
    expect(getPaymentConfig({ PAYMENT_DEFAULT_OUTCOME: 'rejected' }).defaultOutcome).toBe(
      'rejected'
    );
    expect(getPaymentConfig({ PAYMENT_DEFAULT_OUTCOME: 'pending' }).defaultOutcome).toBe('pending');
  });
});
