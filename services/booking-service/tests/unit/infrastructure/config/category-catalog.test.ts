import { getCategoryCatalogConfig } from '../../../../src/infrastructure/config/category-catalog';

describe('getCategoryCatalogConfig', () => {
  it('should return category catalog config from environment variables', () => {
    const config = getCategoryCatalogConfig({
      CONFIGURATION_SERVICE_URL: 'http://configuration-service:4003/',
      CONFIGURATION_INTERNAL_TOKEN: 'internal-token',
      CONFIGURATION_SERVICE_TIMEOUT_MS: '2500',
    });

    expect(config).toEqual({
      baseUrl: 'http://configuration-service:4003',
      internalToken: 'internal-token',
      timeoutMs: 2500,
    });
  });

  it('should use the default timeout when CONFIGURATION_SERVICE_TIMEOUT_MS is missing', () => {
    const config = getCategoryCatalogConfig({
      CONFIGURATION_SERVICE_URL: 'http://configuration-service:4003',
      CONFIGURATION_INTERNAL_TOKEN: 'internal-token',
    });

    expect(config.timeoutMs).toBe(5000);
  });

  it.each([
    'CONFIGURATION_SERVICE_URL',
    'CONFIGURATION_INTERNAL_TOKEN',
  ])('should throw when %s is missing', (missingKey) => {
    const env = {
      CONFIGURATION_SERVICE_URL: 'http://configuration-service:4003',
      CONFIGURATION_INTERNAL_TOKEN: 'internal-token',
    };
    delete env[missingKey as keyof typeof env];

    expect(() => getCategoryCatalogConfig(env)).toThrow(
      `${missingKey} environment variable is required`
    );
  });

  it.each([
    '0',
    '-1',
    '1.5',
    'invalid',
  ])('should throw when CONFIGURATION_SERVICE_TIMEOUT_MS is invalid: %s', (timeoutMs) => {
    expect(() =>
      getCategoryCatalogConfig({
        CONFIGURATION_SERVICE_URL: 'http://configuration-service:4003',
        CONFIGURATION_INTERNAL_TOKEN: 'internal-token',
        CONFIGURATION_SERVICE_TIMEOUT_MS: timeoutMs,
      })
    ).toThrow('CONFIGURATION_SERVICE_TIMEOUT_MS must be a positive integer');
  });
});
