export interface EnvironmentConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  env: string;
}

export function envConfigFromProcess(): EnvironmentConfig {
  const env = process.env.NODE_ENV ?? 'development';
  return {
    isDevelopment: env === 'development',
    isProduction: env === 'production',
    env,
  };
}
