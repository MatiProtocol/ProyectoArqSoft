import { logger as defaultLogger, getCurrentCorrelationId, type ILogger } from '@move/logs-lib';
import type { NextFunction, Request, Response } from 'express';
import { ErrorFactory } from '../application/error-factory';
import type { EnvironmentConfig } from '../config/env';
import { AppError } from '../domain/app-error';
import { ValidationError } from '../domain/errors/validation';

function getLogLevel(err: AppError): 'error' | 'warn' | 'info' {
  if (err.status >= 500) return 'error';
  if (err.status >= 400) return 'warn';
  return 'info';
}

export function createErrorHandler(config: EnvironmentConfig, logger: ILogger = defaultLogger) {
  return function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void {
    const appError = err instanceof AppError ? err : ErrorFactory.fromUnknown(err);

    const correlationId = getCurrentCorrelationId();

    const logPayload = {
      correlationId,
      status: appError.status,
      code: appError.code,
      context: appError.context,
      stack: appError.stack,
    };

    const logLevel = getLogLevel(appError);
    logger[logLevel](`[ERROR] ${appError.message}`, logPayload);

    const isDevelopment = config.isDevelopment;

    const responseBody: Record<string, unknown> = {
      error: appError.message,
      code: appError.code,
      correlationId,
    };

    if (appError instanceof ValidationError) {
      responseBody.issues = appError.issues;
    }

    if (appError.context && isDevelopment) {
      responseBody.context = appError.context;
    }

    if (isDevelopment && appError.stack) {
      responseBody.stack = appError.stack;
    }

    res.status(appError.status).json(responseBody);
  };
}
