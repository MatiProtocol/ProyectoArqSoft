import { getOperatorWebhookConfig } from '../../../../src/infrastructure/config/operator-webhook';

describe('getOperatorWebhookConfig', () => {
  it('should return operator webhook config from environment variables', () => {
    const config = getOperatorWebhookConfig({
      OPERATOR_WEBHOOK_URL: 'https://operator.example.com/webhook',
    });

    expect(config).toEqual({
      url: 'https://operator.example.com/webhook',
      timeoutMs: 900,
    });
  });

  it('should use process.env by default', () => {
    const previousUrl = process.env.OPERATOR_WEBHOOK_URL;
    process.env.OPERATOR_WEBHOOK_URL = 'https://operator.example.com/webhook';

    const config = getOperatorWebhookConfig();

    expect(config).toEqual({
      url: 'https://operator.example.com/webhook',
      timeoutMs: 900,
    });

    process.env.OPERATOR_WEBHOOK_URL = previousUrl;
  });

  it.each([undefined, '', '   '])('should throw when OPERATOR_WEBHOOK_URL is %s', (url) => {
    expect(() =>
      getOperatorWebhookConfig({
        OPERATOR_WEBHOOK_URL: url,
      })
    ).toThrow('OPERATOR_WEBHOOK_URL environment variable is required');
  });

  it.each([
    'not-a-url',
    'ftp://operator.example.com/webhook',
  ])('should throw when OPERATOR_WEBHOOK_URL is invalid: %s', (url) => {
    expect(() =>
      getOperatorWebhookConfig({
        OPERATOR_WEBHOOK_URL: url,
      })
    ).toThrow(/OPERATOR_WEBHOOK_URL/);
  });
});
