import { AppError } from '../app-error';
import { ErrorCode } from '../error-code';

export class BadRequestError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 400, ErrorCode.BAD_REQUEST, context);
    this.name = 'BadRequestError';
  }
}
