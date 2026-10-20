import { AppError } from '../app-error';
import { ErrorCode } from '../error-code';

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, unknown>) {
    super(message, 401, ErrorCode.UNAUTHORIZED, context);
    this.name = 'UnauthorizedError';
  }
}
