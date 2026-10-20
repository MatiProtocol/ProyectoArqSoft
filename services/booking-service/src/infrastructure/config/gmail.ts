export type GmailConfig = {
  user: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  timeoutMs: number;
};

const DEFAULT_GMAIL_TIMEOUT_MS = 10000;

export function getGmailConfig(env: NodeJS.ProcessEnv = process.env): GmailConfig {
  return {
    user: getRequiredEnv(env, 'GMAIL_USER'),
    clientId: getRequiredEnv(env, 'GMAIL_CLIENT_ID'),
    clientSecret: getRequiredEnv(env, 'GMAIL_CLIENT_SECRET'),
    refreshToken: getRequiredEnv(env, 'GMAIL_REFRESH_TOKEN'),
    timeoutMs: getOptionalPositiveIntegerEnv(env, 'GMAIL_TIMEOUT_MS', DEFAULT_GMAIL_TIMEOUT_MS),
  };
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
