import type { ErrorCodeType } from './error-code';
import type { HttpStatus } from './http-status-code';

export interface ErrorContext {
  [key: string]: unknown;
}

export abstract class AppError extends Error {
  public readonly status: HttpStatus;
  public readonly code: ErrorCodeType;
  public readonly context?: ErrorContext;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    status: HttpStatus,
    code: ErrorCodeType,
    context?: ErrorContext,
    isOperational: boolean = true
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.context = context;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      context: this.context,
      stack: this.stack,
    };
  }
}
