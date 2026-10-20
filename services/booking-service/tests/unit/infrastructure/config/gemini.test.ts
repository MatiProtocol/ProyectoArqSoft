import { getGeminiConfig } from '../../../../src/infrastructure/config/gemini';

describe('getGeminiConfig', () => {
  it('should return Gemini config from environment variables', () => {
    const config = getGeminiConfig({
      GOOGLE_GENAI_API_KEY: 'api-key',
      GEMINI_MODEL: 'model-name',
      GEMINI_CLASSIFICATION_PROMPT: 'prompt',
      GEMINI_TIMEOUT_MS: '7500',
    });

    expect(config).toEqual({
      apiKey: 'api-key',
      model: 'model-name',
      classificationPrompt: 'prompt',
      timeoutMs: 7500,
    });
  });

  it('should use process.env by default', () => {
    const previousApiKey = process.env.GOOGLE_GENAI_API_KEY;
    const previousModel = process.env.GEMINI_MODEL;
    const previousPrompt = process.env.GEMINI_CLASSIFICATION_PROMPT;
    const previousTimeout = process.env.GEMINI_TIMEOUT_MS;
    process.env.GOOGLE_GENAI_API_KEY = 'api-key';
    process.env.GEMINI_MODEL = 'model-name';
    process.env.GEMINI_CLASSIFICATION_PROMPT = 'prompt';
    process.env.GEMINI_TIMEOUT_MS = '8000';

    const config = getGeminiConfig();

    expect(config).toEqual({
      apiKey: 'api-key',
      model: 'model-name',
      classificationPrompt: 'prompt',
      timeoutMs: 8000,
    });

    process.env.GOOGLE_GENAI_API_KEY = previousApiKey;
    process.env.GEMINI_MODEL = previousModel;
    process.env.GEMINI_CLASSIFICATION_PROMPT = previousPrompt;
    process.env.GEMINI_TIMEOUT_MS = previousTimeout;
  });

  it('should use the default Gemini timeout when GEMINI_TIMEOUT_MS is missing', () => {
    const config = getGeminiConfig({
      GOOGLE_GENAI_API_KEY: 'api-key',
      GEMINI_MODEL: 'model-name',
      GEMINI_CLASSIFICATION_PROMPT: 'prompt',
    });

    expect(config.timeoutMs).toBe(10000);
  });

  it.each([
    'GOOGLE_GENAI_API_KEY',
    'GEMINI_MODEL',
    'GEMINI_CLASSIFICATION_PROMPT',
  ])('should throw when %s is missing', (missingKey) => {
    const env = {
      GOOGLE_GENAI_API_KEY: 'api-key',
      GEMINI_MODEL: 'model-name',
      GEMINI_CLASSIFICATION_PROMPT: 'prompt',
    };
    delete env[missingKey as keyof typeof env];

    expect(() => getGeminiConfig(env)).toThrow(`${missingKey} environment variable is required`);
  });

  it.each([
    '0',
    '-1',
    '1.5',
    'invalid',
  ])('should throw when GEMINI_TIMEOUT_MS is invalid: %s', (timeoutMs) => {
    expect(() =>
      getGeminiConfig({
        GOOGLE_GENAI_API_KEY: 'api-key',
        GEMINI_MODEL: 'model-name',
        GEMINI_CLASSIFICATION_PROMPT: 'prompt',
        GEMINI_TIMEOUT_MS: timeoutMs,
      })
    ).toThrow('GEMINI_TIMEOUT_MS must be a positive integer');
  });
});
