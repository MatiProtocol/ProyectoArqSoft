import { ErrorFactory } from '../../../src/application/error-factory';
import { BadRequestError } from '../../../src/domain/errors/bad-request';
import { ConflictError } from '../../../src/domain/errors/conflict';
import { ExternalServiceError } from '../../../src/domain/errors/external-service';
import { ForbiddenError } from '../../../src/domain/errors/forbidden';
import { InternalServerError } from '../../../src/domain/errors/internal-server';
import { NotFoundError } from '../../../src/domain/errors/not-found';
import { UnauthorizedError } from '../../../src/domain/errors/unauthorized';
import { ValidationError, type ValidationIssue } from '../../../src/domain/errors/validation';

describe('ErrorFactory', () => {
  describe('factory methods', () => {
    it('badRequest should return BadRequestError', () => {
      const error = ErrorFactory.badRequest('test', {});
      expect(error).toBeInstanceOf(BadRequestError);
    });

    it('notFound should return NotFoundError', () => {
      const error = ErrorFactory.notFound('User');
      expect(error).toBeInstanceOf(NotFoundError);
    });

    it('conflict should return ConflictError', () => {
      const error = ErrorFactory.conflict('test');
      expect(error).toBeInstanceOf(ConflictError);
    });

    it('unauthorized should return UnauthorizedError', () => {
      const error = ErrorFactory.unauthorized();
      expect(error).toBeInstanceOf(UnauthorizedError);
    });

    it('forbidden should return ForbiddenError', () => {
      const error = ErrorFactory.forbidden();
      expect(error).toBeInstanceOf(ForbiddenError);
    });

    it('validation should return ValidationError', () => {
      const issues: ValidationIssue[] = [{ field: 'x', message: 'invalid' }];
      const error = ErrorFactory.validation(issues);
      expect(error).toBeInstanceOf(ValidationError);
    });

    it('externalService should return ExternalServiceError', () => {
      const error = ErrorFactory.externalService('svc', 'fail');
      expect(error).toBeInstanceOf(ExternalServiceError);
    });
  });

  describe('fromUnknown', () => {
    it('should return the same AppError when input is AppError', () => {
      const appError = new BadRequestError('test');
      const result = ErrorFactory.fromUnknown(appError);
      expect(result).toBe(appError);
    });

    it('should convert standard Error to InternalServerError', () => {
      const original = new Error('DB fail');
      const result = ErrorFactory.fromUnknown(original);
      expect(result).toBeInstanceOf(InternalServerError);
      expect(result.message).toBe('DB fail');
      expect(result.context?.originalStack).toBe(original.stack);
    });

    it('should convert non-Error values to InternalServerError with generic message', () => {
      const result = ErrorFactory.fromUnknown('string');
      expect(result).toBeInstanceOf(InternalServerError);
      expect(result.message).toBe('Unknown error occurred');
      expect(result.context).toEqual({});
    });

    it('should handle null and undefined', () => {
      expect(ErrorFactory.fromUnknown(null).message).toBe('Unknown error occurred');
      expect(ErrorFactory.fromUnknown(undefined).message).toBe('Unknown error occurred');
    });
  });
});
