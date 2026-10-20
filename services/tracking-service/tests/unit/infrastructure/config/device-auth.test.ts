import { getDeviceAuthConfig } from '../../../../src/infrastructure/config/device-auth';

describe('getDeviceAuthConfig', () => {
  it('should use process.env by default', () => {
    const previous = process.env.GPS_DEVICE_SECRET;
    process.env.GPS_DEVICE_SECRET = 'env-secret';

    const config = getDeviceAuthConfig();

    expect(config).toEqual({ secret: 'env-secret' });

    process.env.GPS_DEVICE_SECRET = previous;
  });

  it('should return the device secret from environment variables', () => {
    const config = getDeviceAuthConfig({ GPS_DEVICE_SECRET: 'super-secret' });

    expect(config).toEqual({ secret: 'super-secret' });
  });

  it('should trim the secret', () => {
    const config = getDeviceAuthConfig({ GPS_DEVICE_SECRET: '  super-secret  ' });

    expect(config).toEqual({ secret: 'super-secret' });
  });

  it.each([undefined, '', '   '])('should throw when GPS_DEVICE_SECRET is %s', (secret) => {
    expect(() => getDeviceAuthConfig({ GPS_DEVICE_SECRET: secret })).toThrow(
      'GPS_DEVICE_SECRET environment variable is required'
    );
  });
});
