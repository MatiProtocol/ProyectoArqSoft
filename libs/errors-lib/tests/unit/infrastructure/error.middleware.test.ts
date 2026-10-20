import type { NextFunction, Request, Response } from 'express';
import { ErrorFactory } from '../../../src/application/error-factory';
import type { EnvironmentConfig } from '../../../src/config/env';
import { AppError } from '../../../src/domain/app-error';
import { BadRequestError } from '../../../src/domain/errors/bad-request';
import { InternalServerError } from '../../../src/domain/errors/internal-server';
import { ValidationError, type ValidationIssue } from '../../../src/domain/errors/validation';
import { createErrorHandler } from '../../../src/infrastructure/error.middleware';

jest.mock('@move/logs-lib', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  getCurrentCorrelationId: jest.fn(),
}));

jest.mock('../../../src/application/error-factory');

import { getCurrentCorrelationId, logger } from '@move/logs-lib';
import { ErrorCode } from '../../../src/domain/error-code';

const mockedGetCurrentCorrelationId = jest.mocked(getCurrentCorrelationId);
const mockedLogger = jest.mocked(logger);
const mockedErrorFactory = jest.mocked(ErrorFactory);

describe('createErrorMiddleware', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let config: EnvironmentConfig;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();
    req = {} as Request;
    res = { status: statusMock, json: jsonMock } as unknown as Response;
    next = jest.fn();

    config = {
      isDevelopment: false,
      isProduction: true,
      env: 'production',
    };

    jest.clearAllMocks();
    mockedGetCurrentCorrelationId.mockReturnValue('corr-123');
  });

  const createMiddleware = (cfg: EnvironmentConfig = config) => createErrorHandler(cfg);

  describe('when error is already an AppError', () => {
    it('should use the error directly and log at correct level', () => {
      const appError = new BadRequestError('Invalid input', { field: 'email' });
      const middleware = createMiddleware();
      middleware(appError, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid input',
        code: 'BAD_REQUEST',
        correlationId: 'corr-123',
      });

      expect(mockedLogger.warn).toHaveBeenCalledWith(
        '[ERROR] Invalid input',
        expect.objectContaining({
          correlationId: 'corr-123',
          status: 400,
          code: 'BAD_REQUEST',
          context: { field: 'email' },
          stack: appError.stack,
        })
      );
      expect(mockedLogger.error).not.toHaveBeenCalled();
      expect(mockedErrorFactory.fromUnknown).not.toHaveBeenCalled();
    });

    it('should log as error for status >= 500', () => {
      const appError = new InternalServerError('DB down');
      const middleware = createMiddleware();
      middleware(appError, req, res, next);

      expect(mockedLogger.error).toHaveBeenCalledWith(
        '[ERROR] DB down',
        expect.objectContaining({ status: 500 })
      );
    });

    it('should log as info for status < 400', () => {
      class SuccessError extends AppError {
        constructor(message: string) {
          super(message, 200, ErrorCode.BAD_REQUEST);
          this.name = 'SuccessError';
        }
      }
      const appError = new SuccessError('Informational message');
      const middleware = createMiddleware();
      middleware(appError, req, res, next);

      expect(mockedLogger.info).toHaveBeenCalledWith(
        '[ERROR] Informational message',
        expect.objectContaining({ status: 200 })
      );
      expect(mockedLogger.warn).not.toHaveBeenCalled();
      expect(mockedLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('when error is not an AppError', () => {
    it('should convert it using ErrorFactory.fromUnknown', () => {
      const original = new Error('Some error');
      const converted = new BadRequestError('Converted');
      mockedErrorFactory.fromUnknown.mockReturnValue(converted);

      const middleware = createMiddleware();
      middleware(original, req, res, next);

      expect(mockedErrorFactory.fromUnknown).toHaveBeenCalledWith(original);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Converted',
          code: 'BAD_REQUEST',
        })
      );
    });
  });

  describe('response body', () => {
    it('should include issues when error is ValidationError', () => {
      const issues: ValidationIssue[] = [{ field: 'email', message: 'invalid' }];
      const appError = new ValidationError(issues);
      const middleware = createMiddleware();
      middleware(appError, req, res, next);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          issues: issues,
        })
      );
    });

    it('should include context in development mode', () => {
      const devConfig: EnvironmentConfig = { ...config, isDevelopment: true };
      const appError = new BadRequestError('Invalid', { extra: 'dev' });
      const middleware = createMiddleware(devConfig);
      middleware(appError, req, res, next);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          context: { extra: 'dev' },
        })
      );
    });

    it('should not include context in production mode', () => {
      const appError = new BadRequestError('Invalid', { extra: 'prod' });
      const middleware = createMiddleware(config);
      middleware(appError, req, res, next);

      const callArg = jsonMock.mock.calls[0][0];
      expect(callArg).not.toHaveProperty('context');
    });

    it('should include stack in development mode', () => {
      const devConfig: EnvironmentConfig = { ...config, isDevelopment: true };
      const appError = new BadRequestError('Invalid');
      const middleware = createMiddleware(devConfig);
      middleware(appError, req, res, next);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: appError.stack,
        })
      );
    });

    it('should not include stack in production mode', () => {
      const appError = new BadRequestError('Invalid');
      const middleware = createMiddleware(config);
      middleware(appError, req, res, next);

      const callArg = jsonMock.mock.calls[0][0];
      expect(callArg).not.toHaveProperty('stack');
    });
  });

  describe('logging correlationId', () => {
    it('should include correlationId in log payload', () => {
      mockedGetCurrentCorrelationId.mockReturnValue('corr-xyz');
      const appError = new BadRequestError('test');
      const middleware = createMiddleware();
      middleware(appError, req, res, next);

      expect(mockedLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ correlationId: 'corr-xyz' })
      );
    });
  });

  describe('status code handling', () => {
    it('should set status from AppError', () => {
      const appError = new BadRequestError('test');
      const middleware = createMiddleware();
      middleware(appError, req, res, next);
      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });
});
