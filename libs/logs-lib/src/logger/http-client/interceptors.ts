export const timeProvider = {
  now: () => Date.now(),
};

import type { InternalAxiosRequestConfig } from 'axios';
import { getCurrentCorrelationId } from '../context';

export function correlationInterceptor(
  config: InternalAxiosRequestConfig
): InternalAxiosRequestConfig {
  const correlationId = getCurrentCorrelationId();

  if (correlationId) {
    config.headers['X-Correlation-ID'] = correlationId;
  }

  config.metadata = {
    startTime: timeProvider.now(),
  };

  return config;
}

import type { AxiosResponse } from 'axios';
import { logger } from '../index';

export function responseLoggerInterceptor(response: AxiosResponse): AxiosResponse {
  const duration = timeProvider.now() - (response.config.metadata?.startTime ?? timeProvider.now());

  logger.debug(
    `[HTTP IN] ${response.config.method?.toUpperCase()} ${response.config.url} → ${response.status} (${duration}ms)`
  );

  return response;
}

import type { AxiosError } from 'axios';

export function errorLoggerInterceptor(error: AxiosError): Promise<never> {
  const duration = timeProvider.now() - (error.config?.metadata?.startTime ?? timeProvider.now());

  logger.error(
    `[HTTP ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${error.response?.status ?? 'N/A'} (${duration}ms)`,
    {
      message: error.message,
      data: error.response?.data,
    }
  );

  return Promise.reject(error);
}
