import { ErrorFactory as OriginalErrorFactory } from '../../src/application/error-factory';
import {
  tryAsync as originalTryAsync,
  trySync as originalTrySync,
} from '../../src/application/try-helpers';
import { envConfigFromProcess as originalEnvConfigFromProcess } from '../../src/config/env';
import { AppError as OriginalAppError } from '../../src/domain/app-error';
import { ErrorCode as OriginalErrorCode } from '../../src/domain/error-code';
import { BadRequestError as OriginalBadRequestError } from '../../src/domain/errors/bad-request';
import { ConflictError as OriginalConflictError } from '../../src/domain/errors/conflict';
import { ExternalServiceError as OriginalExternalServiceError } from '../../src/domain/errors/external-service';
import { ForbiddenError as OriginalForbiddenError } from '../../src/domain/errors/forbidden';
import { InternalServerError as OriginalInternalServerError } from '../../src/domain/errors/internal-server';
import { NotFoundError as OriginalNotFoundError } from '../../src/domain/errors/not-found';
import { UnauthorizedError as OriginalUnauthorizedError } from '../../src/domain/errors/unauthorized';
import { ValidationError as OriginalValidationError } from '../../src/domain/errors/validation';
import * as errorLib from '../../src/index';
import { createErrorHandler as originalCreateErrorHandler } from '../../src/infrastructure/error.middleware';

describe('@move/error-lib', () => {
  it('exports AppError (abstract class)', () => {
    expect(errorLib.AppError).toBeDefined();
    expect(errorLib.AppError).toBe(OriginalAppError);
    expect(typeof errorLib.AppError).toBe('function');
  });

  it('exports ErrorCode object and ErrorCodeType type', () => {
    expect(errorLib.ErrorCode).toBeDefined();
    expect(errorLib.ErrorCode).toBe(OriginalErrorCode);
    expect(typeof errorLib.ErrorCode).toBe('object');
    expect(errorLib.ErrorCode.BAD_REQUEST).toBe('BAD_REQUEST');
    expect(errorLib.ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
  });

  it('exports BadRequestError', () => {
    expect(errorLib.BadRequestError).toBeDefined();
    expect(errorLib.BadRequestError).toBe(OriginalBadRequestError);
    expect(typeof errorLib.BadRequestError).toBe('function');
  });

  it('exports ConflictError', () => {
    expect(errorLib.ConflictError).toBeDefined();
    expect(errorLib.ConflictError).toBe(OriginalConflictError);
    expect(typeof errorLib.ConflictError).toBe('function');
  });

  it('exports ExternalServiceError', () => {
    expect(errorLib.ExternalServiceError).toBeDefined();
    expect(errorLib.ExternalServiceError).toBe(OriginalExternalServiceError);
    expect(typeof errorLib.ExternalServiceError).toBe('function');
  });

  it('exports ForbiddenError', () => {
    expect(errorLib.ForbiddenError).toBeDefined();
    expect(errorLib.ForbiddenError).toBe(OriginalForbiddenError);
    expect(typeof errorLib.ForbiddenError).toBe('function');
  });

  it('exports InternalServerError', () => {
    expect(errorLib.InternalServerError).toBeDefined();
    expect(errorLib.InternalServerError).toBe(OriginalInternalServerError);
    expect(typeof errorLib.InternalServerError).toBe('function');
  });

  it('exports NotFoundError', () => {
    expect(errorLib.NotFoundError).toBeDefined();
    expect(errorLib.NotFoundError).toBe(OriginalNotFoundError);
    expect(typeof errorLib.NotFoundError).toBe('function');
  });

  it('exports UnauthorizedError', () => {
    expect(errorLib.UnauthorizedError).toBeDefined();
    expect(errorLib.UnauthorizedError).toBe(OriginalUnauthorizedError);
    expect(typeof errorLib.UnauthorizedError).toBe('function');
  });

  it('exports ValidationError and ValidationIssue type', () => {
    expect(errorLib.ValidationError).toBeDefined();
    expect(errorLib.ValidationError).toBe(OriginalValidationError);
    expect(typeof errorLib.ValidationError).toBe('function');
  });

  it('exports ErrorFactory (object with factory methods)', () => {
    expect(errorLib.ErrorFactory).toBeDefined();
    expect(errorLib.ErrorFactory).toBe(OriginalErrorFactory);
    expect(typeof errorLib.ErrorFactory).toBe('object');
    expect(errorLib.ErrorFactory.badRequest).toBeDefined();
    expect(typeof errorLib.ErrorFactory.badRequest).toBe('function');
    expect(errorLib.ErrorFactory.notFound).toBeDefined();
    expect(typeof errorLib.ErrorFactory.notFound).toBe('function');
    expect(errorLib.ErrorFactory.fromUnknown).toBeDefined();
    expect(typeof errorLib.ErrorFactory.fromUnknown).toBe('function');
  });

  it('exports trySync and tryAsync helper functions', () => {
    expect(errorLib.trySync).toBeDefined();
    expect(errorLib.trySync).toBe(originalTrySync);
    expect(typeof errorLib.trySync).toBe('function');

    expect(errorLib.tryAsync).toBeDefined();
    expect(errorLib.tryAsync).toBe(originalTryAsync);
    expect(typeof errorLib.tryAsync).toBe('function');
  });

  it('exports createErrorHandler (Express error handler factory)', () => {
    expect(errorLib.createErrorHandler).toBeDefined();
    expect(errorLib.createErrorHandler).toBe(originalCreateErrorHandler);
    expect(typeof errorLib.createErrorHandler).toBe('function');
  });

  it('exports envConfigFromProcess and EnvironmentConfig type', () => {
    expect(errorLib.envConfigFromProcess).toBeDefined();
    expect(errorLib.envConfigFromProcess).toBe(originalEnvConfigFromProcess);
    expect(typeof errorLib.envConfigFromProcess).toBe('function');
  });
});
