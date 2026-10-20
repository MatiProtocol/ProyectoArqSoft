import { AppError, type ErrorContext } from '../../../src/domain/app-error';
import { ErrorCode, type ErrorCodeType } from '../../../src/domain/error-code';
import type { HttpStatus } from '../../../src/domain/http-status-code';

class TestError extends AppError {
  constructor(
    message: string,
    status: HttpStatus,
    code: ErrorCodeType,
    context?: ErrorContext,
    isOperational?: boolean
  ) {
    super(message, status, code, context, isOperational);
    this.name = 'TestError';
  }
}

describe('AppError (via TestError subclass)', () => {
  const defaultMessage = 'Something went wrong';
  const defaultStatus: HttpStatus = 500;
  const defaultCode: ErrorCodeType = ErrorCode.INTERNAL_SERVER_ERROR;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create an instance with required fields', () => {
    const error = new TestError(defaultMessage, defaultStatus, defaultCode);

    expect(error).toBeInstanceOf(TestError);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(defaultMessage);
    expect(error.status).toBe(defaultStatus);
    expect(error.code).toBe(defaultCode);
    expect(error.isOperational).toBe(true);
    expect(error.context).toBeUndefined();
    expect(error.name).toBe('TestError');
    expect(error.stack).toBeDefined();
    expect(typeof error.stack).toBe('string');
  });

  it('should accept an optional context and set isOperational to false', () => {
    const context: ErrorContext = { userId: 123, reason: 'Invalid input' };
    const error = new TestError(
      'Validation failed',
      400,
      ErrorCode.VALIDATION_ERROR,
      context,
      false
    );

    expect(error.status).toBe(400);
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.context).toEqual(context);
    expect(error.isOperational).toBe(false);
  });

  it('should set isOperational to true by default when not provided', () => {
    const error = new TestError(defaultMessage, defaultStatus, defaultCode, {});
    expect(error.isOperational).toBe(true);
  });

  it('should capture stack trace', () => {
    const captureStackTraceSpy = jest.spyOn(Error, 'captureStackTrace');
    const error = new TestError(defaultMessage, defaultStatus, defaultCode);
    expect(captureStackTraceSpy).toHaveBeenCalledWith(error, TestError);
    expect(error.stack).toBeDefined();
    expect(error.stack?.length).toBeGreaterThan(0);
    captureStackTraceSpy.mockRestore();
  });

  it('should correctly serialize to JSON using toJSON()', () => {
    const context = { requestId: 'abc-123' };
    const error = new TestError('Not found', 404, ErrorCode.NOT_FOUND, context, true);

    const json = error.toJSON();

    expect(json).toEqual({
      name: 'TestError',
      message: 'Not found',
      status: 404,
      code: ErrorCode.NOT_FOUND,
      context: context,
      stack: error.stack,
    });
  });

  it('should include stack in JSON when present', () => {
    const error = new TestError('Error with stack', 500, ErrorCode.INTERNAL_SERVER_ERROR);
    const json = error.toJSON();
    expect(json.stack).toBeDefined();
    expect(typeof json.stack).toBe('string');
    expect(json.stack).toBe(error.stack);
  });

  it('should accept various HTTP status codes and error codes', () => {
    const statuses: HttpStatus[] = [200, 201, 400, 401, 403, 404, 409, 422, 429, 500, 502];
    const codes = Object.values(ErrorCode) as ErrorCodeType[];

    for (const status of statuses) {
      for (const code of codes) {
        const error = new TestError('Test', status, code);
        expect(error.status).toBe(status);
        expect(error.code).toBe(code);
      }
    }
  });

  it('should allow any context object with string keys and unknown values', () => {
    const context: ErrorContext = {
      extra: 'info',
      numeric: 42,
      nested: { deep: true },
      maybe: null,
      undefinedProp: undefined,
    };
    const error = new TestError('Context test', 500, ErrorCode.INTERNAL_SERVER_ERROR, context);
    expect(error.context).toEqual(context);
  });

  it('should preserve prototype chain so instanceof works', () => {
    const error = new TestError('test', 500, ErrorCode.INTERNAL_SERVER_ERROR);
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof Error).toBe(true);
    expect(error.constructor).toBe(TestError);
  });

  it('should have correct name property (TestError)', () => {
    const error = new TestError('test', 500, ErrorCode.INTERNAL_SERVER_ERROR);
    expect(error.name).toBe('TestError');
  });
});
