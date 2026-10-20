import { getOperatorWebhookConfig } from '../../../../src/infrastructure/config/operator-webhook';

describe('getOperatorWebhookConfig', () => {
  it('should return operator webhook config from environment variables', () => {
    const config = getOperatorWebhookConfig({
      OPERATOR_WEBHOOK_URL: 'https://operator.example.com/webhook',
    });

    expect(config).toEqual({
      url: 'https://operator.example.com/webhook',
      timeoutMs: 2000,
    });
  });

  it('should use process.env by default', () => {
    const previousUrl = process.env.OPERATOR_WEBHOOK_URL;
    process.env.OPERATOR_WEBHOOK_URL = 'https://operator.example.com/webhook';

    const config = getOperatorWebhookConfig();

    expect(config).toEqual({
      url: 'https://operator.example.com/webhook',
      timeoutMs: 2000,
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

  it('should throw when OPERATOR_WEBHOOK_URL is not a valid URL', () => {
    expect(() =>
      getOperatorWebhookConfig({
        OPERATOR_WEBHOOK_URL: 'not-a-url',
      })
    ).toThrow('OPERATOR_WEBHOOK_URL must be a valid URL');
  });

  it('should throw when OPERATOR_WEBHOOK_URL uses an unsupported protocol', () => {
    expect(() =>
      getOperatorWebhookConfig({
        OPERATOR_WEBHOOK_URL: 'ftp://operator.example.com/webhook',
      })
    ).toThrow('OPERATOR_WEBHOOK_URL must use http or https');
  });
});
