import { AppError } from '../app-error';
import { ErrorCode } from '../error-code';

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 409, ErrorCode.CONFLICT, context);
    this.name = 'ConflictError';
  }
}
