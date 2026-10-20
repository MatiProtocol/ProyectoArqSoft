import { AppError } from '../app-error';
import { ErrorCode } from '../error-code';

export class ExternalServiceError extends AppError {
  public readonly serviceName: string;
  public readonly originalError?: Error;

  constructor(
    serviceName: string,
    message: string,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(
      `External service "${serviceName}" failed: ${message}`,
      502,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      { serviceName, originalMessage: originalError?.message, ...context }
    );
    this.serviceName = serviceName;
    this.originalError = originalError;
    this.name = 'ExternalServiceError';
  }
}
