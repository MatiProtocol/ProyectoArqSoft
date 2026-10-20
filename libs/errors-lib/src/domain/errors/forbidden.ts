import { AppError } from '../app-error';
import { ErrorCode } from '../error-code';

export class ForbiddenError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, unknown>) {
    super(message, 403, ErrorCode.FORBIDDEN, context);
    this.name = 'ForbiddenError';
  }
}
