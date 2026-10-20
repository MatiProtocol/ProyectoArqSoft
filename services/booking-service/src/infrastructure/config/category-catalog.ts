export type CategoryCatalogConfig = {
  baseUrl: string;
  internalToken: string;
  timeoutMs: number;
};

const DEFAULT_CATEGORY_CATALOG_TIMEOUT_MS = 5000;

export function getCategoryCatalogConfig(
  env: NodeJS.ProcessEnv = process.env
): CategoryCatalogConfig {
  return {
    baseUrl: normalizeBaseUrl(getRequiredEnv(env, 'CONFIGURATION_SERVICE_URL')),
    internalToken: getRequiredEnv(env, 'CONFIGURATION_INTERNAL_TOKEN'),
    timeoutMs: getOptionalPositiveIntegerEnv(
      env,
      'CONFIGURATION_SERVICE_TIMEOUT_MS',
      DEFAULT_CATEGORY_CATALOG_TIMEOUT_MS
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
