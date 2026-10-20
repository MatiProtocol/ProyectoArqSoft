export type DeviceAuthConfig = {
  secret: string;
};

export function getDeviceAuthConfig(env: NodeJS.ProcessEnv = process.env): DeviceAuthConfig {
  const secret = env.GPS_DEVICE_SECRET?.trim();

  if (!secret) {
    throw new Error('GPS_DEVICE_SECRET environment variable is required');
  }

  return { secret };
}
