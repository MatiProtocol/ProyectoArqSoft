import { AppError } from '../app-error';
import { ErrorCode } from '../error-code';

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', context?: Record<string, unknown>) {
    super(message, 500, ErrorCode.INTERNAL_SERVER_ERROR, context, false);
    this.name = 'InternalServerError';
  }
}
