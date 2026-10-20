export type IdentityServiceConfig = {
  baseUrl: string;
  internalToken: string;
  timeoutMs: number;
};

const DEFAULT_IDENTITY_SERVICE_TIMEOUT_MS = 5000;

export function getIdentityServiceConfig(
  env: NodeJS.ProcessEnv = process.env
): IdentityServiceConfig {
  return {
    baseUrl: normalizeBaseUrl(getRequiredEnv(env, 'IDENTITY_SERVICE_URL')),
    internalToken: getRequiredEnv(env, 'IDENTITY_INTERNAL_TOKEN'),
    timeoutMs: getOptionalPositiveIntegerEnv(
      env,
      'IDENTITY_SERVICE_TIMEOUT_MS',
      DEFAULT_IDENTITY_SERVICE_TIMEOUT_MS
    ),
  };
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function getRequiredEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];

  if (!value || value.trim() === '') {
    throw new Error(`${key} environment variable is required`);
  }

  return value;
}

function getOptionalPositiveIntegerEnv(
  env: NodeJS.ProcessEnv,
  key: string,
  defaultValue: number
): number {
  const value = env[key];

  if (!value || value.trim() === '') return defaultValue;

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }

  return parsedValue;
}
