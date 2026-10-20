jest.mock('../../../../src/logger/context', () => ({
  getCurrentCorrelationId: jest.fn(),
}));

jest.mock('../../../../src/logger/index', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

import { getCurrentCorrelationId } from '../../../../src/logger/context';
import {
  correlationInterceptor,
  errorLoggerInterceptor,
  responseLoggerInterceptor,
  timeProvider,
} from '../../../../src/logger/http-client/interceptors';
import { logger } from '../../../../src/logger/index';

const mockedGetCurrentCorrelationId = jest.mocked(getCurrentCorrelationId);
const mockedLogger = jest.mocked(logger);

import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const mockNow = jest.spyOn(timeProvider, 'now');

function createRequestConfig(
  overrides: Partial<InternalAxiosRequestConfig> = {}
): InternalAxiosRequestConfig {
  return {
    headers: {},
    method: 'get',
    url: '',
    ...overrides,
  } as InternalAxiosRequestConfig;
}

function createResponse(overrides: Partial<AxiosResponse> = {}): AxiosResponse {
  return {
    status: 200,
    statusText: 'OK',
    data: {},
    headers: {},
    config: createRequestConfig(),
    ...overrides,
  } as AxiosResponse;
}

function createError(overrides: Partial<AxiosError> = {}): AxiosError {
  return {
    name: 'AxiosError',
    message: '',
    isAxiosError: true,
    config: createRequestConfig(),
    ...overrides,
  } as AxiosError;
}

describe('correlationInterceptor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNow.mockReturnValue(1000);
  });

  it('should inject correlation id and metadata', () => {
    mockedGetCurrentCorrelationId.mockReturnValue('corr-1');

    const config = createRequestConfig();
    const result = correlationInterceptor(config);

    expect(result.headers['X-Correlation-ID']).toBe('corr-1');
    expect(result.metadata).toEqual({
      startTime: 1000,
    });
  });

  it('should handle missing correlation id', () => {
    mockedGetCurrentCorrelationId.mockReturnValue(undefined);

    const config = createRequestConfig();
    const result = correlationInterceptor(config);

    expect(result.headers['X-Correlation-ID']).toBeUndefined();
    expect(result.metadata?.startTime).toBe(1000);
  });
});

describe('responseLoggerInterceptor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log response duration correctly', () => {
    mockNow.mockReturnValueOnce(2000).mockReturnValueOnce(1500);

    const response = createResponse({
      status: 200,
      config: createRequestConfig({
        method: 'get',
        url: '/users',
        metadata: { startTime: 1500 },
      }),
    });

    responseLoggerInterceptor(response);

    expect(mockedLogger.debug).toHaveBeenCalledWith('[HTTP IN] GET /users → 200 (500ms)');
  });

  it('should handle missing metadata safely', () => {
    mockNow.mockReturnValue(2000);

    const response = createResponse({
      status: 200,
      config: createRequestConfig({
        method: 'get',
        url: '/users',
      }),
    });

    responseLoggerInterceptor(response);

    expect(mockedLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('[HTTP IN] GET /users → 200')
    );
  });
});

describe('errorLoggerInterceptor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log error with duration and reject', async () => {
    mockNow.mockReturnValueOnce(3000).mockReturnValueOnce(2500);

    const error = createError({
      message: 'Request failed',
      config: createRequestConfig({
        method: 'post',
        url: '/users',
        metadata: { startTime: 2500 },
      }),
      response: {
        status: 500,
        data: { error: 'boom' },
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as any,
      },
    });

    await expect(errorLoggerInterceptor(error)).rejects.toEqual(error);

    expect(mockedLogger.error).toHaveBeenCalledWith('[HTTP ERROR] POST /users → 500 (500ms)', {
      message: 'Request failed',
      data: { error: 'boom' },
    });
  });

  it('should handle missing config safely', async () => {
    mockNow.mockReturnValue(4000);

    const error = createError({
      message: 'fail',
      config: undefined,
    });

    await expect(errorLoggerInterceptor(error)).rejects.toEqual(error);

    expect(mockedLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('[HTTP ERROR]'),
      expect.objectContaining({
        message: 'fail',
      })
    );
  });
});

describe('timeProvider', () => {
  it('should return the current timestamp using Date.now()', () => {
    const realNow = Date.now();
    mockNow.mockReturnValueOnce(Date.now()).mockReturnValueOnce(Date.now());
    expect(timeProvider.now()).toBeGreaterThanOrEqual(realNow);
    expect(timeProvider.now()).toBeLessThanOrEqual(realNow + 10);
  });
});
