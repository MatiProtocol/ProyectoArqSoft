export type OperatorWebhookConfig = {
  url: string;
  timeoutMs: number;
};

const WEBHOOK_TIMEOUT_MS = 2000;

export function getOperatorWebhookConfig(
  env: NodeJS.ProcessEnv = process.env
): OperatorWebhookConfig {
  const url = env.OPERATOR_WEBHOOK_URL?.trim();

  if (!url) {
    throw new Error('OPERATOR_WEBHOOK_URL environment variable is required');
  }

  return {
    url: validateUrl(url),
    timeoutMs: WEBHOOK_TIMEOUT_MS,
  };
}

function validateUrl(value: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error('OPERATOR_WEBHOOK_URL must be a valid URL');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('OPERATOR_WEBHOOK_URL must use http or https');
  }

  return value;
}
