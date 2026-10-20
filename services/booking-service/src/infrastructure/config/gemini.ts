export type GeminiConfig = {
  apiKey: string;
  model: string;
  classificationPrompt: string;
  timeoutMs: number;
};

const DEFAULT_GEMINI_TIMEOUT_MS = 10000;

export function getGeminiConfig(env: NodeJS.ProcessEnv = process.env): GeminiConfig {
  return {
    apiKey: getRequiredEnv(env, 'GOOGLE_GENAI_API_KEY'),
    model: getRequiredEnv(env, 'GEMINI_MODEL'),
    classificationPrompt: getRequiredEnv(env, 'GEMINI_CLASSIFICATION_PROMPT'),
    timeoutMs: getOptionalPositiveIntegerEnv(env, 'GEMINI_TIMEOUT_MS', DEFAULT_GEMINI_TIMEOUT_MS),
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
