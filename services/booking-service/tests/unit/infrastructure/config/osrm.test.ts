import { getOsrmConfig } from '../../../../src/infrastructure/config/osrm';

describe('getOsrmConfig', () => {
  it('should return default values when env variables are not provided', () => {
    const config = getOsrmConfig({});
    expect(config).toEqual({
      baseUrl: 'http://router.project-osrm.org',
      timeoutMs: 200,
      baseRatePerKm: 5.0,
      surchargePercentPerRule: 20,
    });
  });

  it('should parse environment variables correctly', () => {
    const env = {
      OSRM_URL: 'https://custom-osrm.example.com/',
      OSRM_TIMEOUT_MS: '500',
      BASE_RATE_PER_KM: '10.5',
      SURCHARGE_PERCENT_PER_RULE: '25.5',
    };
    const config = getOsrmConfig(env);
    expect(config).toEqual({
      baseUrl: 'https://custom-osrm.example.com',
      timeoutMs: 500,
      baseRatePerKm: 10.5,
      surchargePercentPerRule: 25.5,
    });
  });

  it('should use default values if environment variables are invalid or negative', () => {
    const env = {
      OSRM_URL: 'https://custom-osrm.example.com',
      OSRM_TIMEOUT_MS: '-100',
      BASE_RATE_PER_KM: 'abc',
      SURCHARGE_PERCENT_PER_RULE: '-10.5',
    };
    const config = getOsrmConfig(env);
    expect(config).toEqual({
      baseUrl: 'https://custom-osrm.example.com',
      timeoutMs: 200, // Invalid -100 defaults to 200
      baseRatePerKm: 5.0, // Invalid abc defaults to 5.0
      surchargePercentPerRule: 20, // Invalid -10.5 defaults to 20
    });
  });

  it('should fallback to defaults if numbers are zero or NaN', () => {
    const env = {
      OSRM_TIMEOUT_MS: '0',
      BASE_RATE_PER_KM: '0',
      SURCHARGE_PERCENT_PER_RULE: 'NaN',
    };
    const config = getOsrmConfig(env);
    expect(config.timeoutMs).toBe(200);
    expect(config.baseRatePerKm).toBe(5.0);
    expect(config.surchargePercentPerRule).toBe(20);
  });

  it('should strip trailing slashes from the baseUrl', () => {
    const env = { OSRM_URL: 'http://my-osrm.com///' };
    const config = getOsrmConfig(env);
    expect(config.baseUrl).toBe('http://my-osrm.com');
  });

  it('should fallback to defaults if strings are empty or whitespace', () => {
    const env = {
      OSRM_TIMEOUT_MS: '   ',
      BASE_RATE_PER_KM: '',
      SURCHARGE_PERCENT_PER_RULE: '  ',
    };
    const config = getOsrmConfig(env);
    expect(config.timeoutMs).toBe(200);
    expect(config.baseRatePerKm).toBe(5.0);
    expect(config.surchargePercentPerRule).toBe(20);
  });

  it('should ignore float numbers for timeoutMs and use default', () => {
    const env = { OSRM_TIMEOUT_MS: '200.5' };
    const config = getOsrmConfig(env);
    expect(config.timeoutMs).toBe(200);
  });
});
