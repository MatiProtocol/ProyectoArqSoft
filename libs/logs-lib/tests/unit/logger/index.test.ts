import type { AxiosInstance } from 'axios';
import { getLoggerConfig, type LoggerConfig } from '../../../src/config/env';
import { createHttpClient } from '../../../src/logger/http-client/create-client';
import {
  correlationInterceptor,
  errorLoggerInterceptor,
  responseLoggerInterceptor,
} from '../../../src/logger/http-client/interceptors';
import { buildHttpClient, buildLogger } from '../../../src/logger/index';
import { createLogger } from '../../../src/logger/infrastructure/logger';
import { createTransports } from '../../../src/logger/infrastructure/transports';

jest.mock('../../../src/config/env', () => ({
  getLoggerConfig: jest.fn(),
}));

jest.mock('../../../src/logger/infrastructure/transports', () => ({
  createTransports: jest.fn(),
}));

jest.mock('../../../src/logger/infrastructure/logger', () => ({
  createLogger: jest.fn(),
}));

const mockedGetLoggerConfig = jest.mocked(getLoggerConfig);
const mockedCreateTransports = jest.mocked(createTransports);
const mockedCreateLogger = jest.mocked(createLogger);

jest.mock('../../../src/logger/http-client/create-client');
jest.mock('uuid', () => ({
  v4: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
}));

const mockedCreateHttpClient = jest.mocked(createHttpClient);

describe('@move/logs-lib - buildLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should build logger using config and transports', () => {
    const config: LoggerConfig = {
      serviceName: 'test-service',
      instanceId: '1',
      logLevel: 'info',
      nodeEnv: 'test',
      logDirectory: '/tmp',
      logMaxSize: '100m',
      logMaxFiles: '1d',
      fileLogLevel: 'debug',
    };

    const transports = [{ type: 'console' }] as unknown as ReturnType<typeof createTransports>;
    const loggerInstance = { log: jest.fn() } as unknown as ReturnType<typeof createLogger>;

    mockedGetLoggerConfig.mockReturnValue(config);
    mockedCreateTransports.mockReturnValue(transports);
    mockedCreateLogger.mockReturnValue(loggerInstance);

    const result = buildLogger();

    expect(mockedGetLoggerConfig).toHaveBeenCalledTimes(1);
    expect(mockedCreateTransports).toHaveBeenCalledTimes(1);
    expect(mockedCreateTransports).toHaveBeenCalledWith(config);
    expect(mockedCreateLogger).toHaveBeenCalledTimes(1);
    expect(mockedCreateLogger).toHaveBeenCalledWith(config, transports);
    expect(result).toBe(loggerInstance);
  });
});

describe('@move/logs-lib - buildHttpClient', () => {
  const baseURL = 'https://api.example.com';
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
  } as unknown as AxiosInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateHttpClient.mockReturnValue(mockAxiosInstance);
  });

  it('should call createHttpClient with base URL, headers and interceptors', () => {
    const headers = { 'X-Custom': 'value' };

    const result = buildHttpClient(baseURL, headers);

    expect(mockedCreateHttpClient).toHaveBeenCalledTimes(1);
    expect(mockedCreateHttpClient).toHaveBeenCalledWith(baseURL, headers, {
      onRequest: correlationInterceptor,
      onResponse: responseLoggerInterceptor,
      onError: errorLoggerInterceptor,
    });
    expect(result).toBe(mockAxiosInstance);
  });

  it('should pass undefined for headers when not provided', () => {
    buildHttpClient(baseURL);

    expect(mockedCreateHttpClient).toHaveBeenCalledWith(baseURL, undefined, {
      onRequest: correlationInterceptor,
      onResponse: responseLoggerInterceptor,
      onError: errorLoggerInterceptor,
    });
  });

  it('should return the Axios instance created by createHttpClient', () => {
    const customInstance = { get: jest.fn() } as unknown as AxiosInstance;
    mockedCreateHttpClient.mockReturnValueOnce(customInstance);

    const result = buildHttpClient(baseURL);

    expect(result).toBe(customInstance);
  });
});
