import { AppError } from '../app-error';
import { ErrorCode } from '../error-code';

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number, context?: Record<string, unknown>) {
    const message = identifier
      ? `${resource} with identifier "${identifier}" not found`
      : `${resource} not found`;
    super(message, 404, ErrorCode.NOT_FOUND, { resource, identifier, ...context });
    this.name = 'NotFoundError';
  }
}
