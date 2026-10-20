import { AppError } from '../../../../src/domain/app-error';
import { ErrorCode } from '../../../../src/domain/error-code';
import { ExternalServiceError } from '../../../../src/domain/errors/external-service';

describe('ExternalServiceError', () => {
  const serviceName = 'PaymentGateway';
  const message = 'Connection timeout';

  it('should create an instance with status 502 and EXTERNAL_SERVICE_ERROR code', () => {
    const error = new ExternalServiceError(serviceName, message);

    expect(error).toBeInstanceOf(ExternalServiceError);
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(502);
    expect(error.code).toBe(ErrorCode.EXTERNAL_SERVICE_ERROR);
    expect(error.name).toBe('ExternalServiceError');
    expect(error.serviceName).toBe(serviceName);
    expect(error.originalError).toBeUndefined();
  });

  it('should build message with service name and error message', () => {
    const error = new ExternalServiceError(serviceName, message);
    expect(error.message).toBe(`External service "${serviceName}" failed: ${message}`);
  });

  it('should store originalError when provided', () => {
    const original = new Error('Socket hang up');
    const error = new ExternalServiceError(serviceName, message, original);

    expect(error.originalError).toBe(original);
    expect(error.message).toBe(`External service "${serviceName}" failed: ${message}`);
  });

  it('should include serviceName and originalMessage in context', () => {
    const original = new Error('Timeout');
    const error = new ExternalServiceError(serviceName, message, original);

    expect(error.context).toMatchObject({
      serviceName: serviceName,
      originalMessage: 'Timeout',
    });
  });

  it('should merge additional context', () => {
    const extra = { retryCount: 3 };
    const error = new ExternalServiceError(serviceName, message, undefined, extra);

    expect(error.context).toMatchObject({
      serviceName: serviceName,
      retryCount: 3,
    });
    expect(error.context?.originalMessage).toBeUndefined();
  });

  it('should handle missing originalError in context', () => {
    const error = new ExternalServiceError(serviceName, message);
    expect(error.context).toEqual({ serviceName: serviceName });
  });

  it('should serialize to JSON correctly', () => {
    const original = new Error('Network error');
    const error = new ExternalServiceError('Redis', 'Connection refused', original);
    const json = error.toJSON();

    expect(json).toMatchObject({
      name: 'ExternalServiceError',
      message: 'External service "Redis" failed: Connection refused',
      status: 502,
      code: ErrorCode.EXTERNAL_SERVICE_ERROR,
      context: {
        serviceName: 'Redis',
        originalMessage: 'Network error',
      },
    });
    expect(json.stack).toBeDefined();
    expect(json.stack).toBe(error.stack);
  });

  it('should preserve prototype chain', () => {
    const error = new ExternalServiceError(serviceName, message);
    expect(error instanceof ExternalServiceError).toBe(true);
    expect(error instanceof AppError).toBe(true);
    expect(error.constructor).toBe(ExternalServiceError);
  });
});
