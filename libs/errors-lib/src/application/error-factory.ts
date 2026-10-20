import { AppError } from '../domain/app-error';
import { BadRequestError } from '../domain/errors/bad-request';
import { ConflictError } from '../domain/errors/conflict';
import { ExternalServiceError } from '../domain/errors/external-service';
import { ForbiddenError } from '../domain/errors/forbidden';
import { InternalServerError } from '../domain/errors/internal-server';
import { NotFoundError } from '../domain/errors/not-found';
import { UnauthorizedError } from '../domain/errors/unauthorized';
import { ValidationError, type ValidationIssue } from '../domain/errors/validation';

export const ErrorFactory = {
  badRequest: (message: string, context?: Record<string, unknown>): BadRequestError =>
    new BadRequestError(message, context),

  notFound: (
    resource: string,
    identifier?: string | number,
    context?: Record<string, unknown>
  ): NotFoundError => new NotFoundError(resource, identifier, context),

  conflict: (message: string, context?: Record<string, unknown>): ConflictError =>
    new ConflictError(message, context),

  unauthorized: (message?: string, context?: Record<string, unknown>): UnauthorizedError =>
    new UnauthorizedError(message, context),

  forbidden: (message?: string, context?: Record<string, unknown>): ForbiddenError =>
    new ForbiddenError(message, context),

  validation: (issues: ValidationIssue[], context?: Record<string, unknown>): ValidationError =>
    new ValidationError(issues, context),

  externalService: (
    serviceName: string,
    message: string,
    originalError?: Error,
    context?: Record<string, unknown>
  ): ExternalServiceError => new ExternalServiceError(serviceName, message, originalError, context),

  fromUnknown: (err: unknown): AppError => {
    if (err instanceof AppError) {
      return err;
    }

    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    const stack = err instanceof Error ? err.stack : undefined;

    return new InternalServerError(message, { originalStack: stack });
  },
};
