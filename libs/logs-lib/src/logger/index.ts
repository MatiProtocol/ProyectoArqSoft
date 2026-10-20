import type { AxiosInstance } from 'axios';
import { getLoggerConfig } from '../config/env';
import type { ILogger } from './domain/interfaces/logger';
import { createHttpClient } from './http-client/create-client';
import {
  correlationInterceptor,
  errorLoggerInterceptor,
  responseLoggerInterceptor,
} from './http-client/interceptors';
import { createLogger } from './infrastructure/logger';
import { createTransports } from './infrastructure/transports';

export function buildHttpClient(baseURL: string, headers?: Record<string, string>): AxiosInstance {
  return createHttpClient(baseURL, headers, {
    onRequest: correlationInterceptor,
    onResponse: responseLoggerInterceptor,
    onError: errorLoggerInterceptor,
  });
}

export function buildLogger(): ILogger {
  const config = getLoggerConfig();
  const transports = createTransports(config);
  return createLogger(config, transports);
}

export const logger: ILogger = buildLogger();
