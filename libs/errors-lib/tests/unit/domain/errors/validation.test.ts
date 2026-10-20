import { AppError } from '../../../../src/domain/app-error';
import { ErrorCode } from '../../../../src/domain/error-code';
import { ValidationError, type ValidationIssue } from '../../../../src/domain/errors/validation';

describe('ValidationError', () => {
  const sampleIssues: ValidationIssue[] = [
    { field: 'email', message: 'must be a valid email' },
    { field: 'password', message: 'must be at least 8 characters' },
  ];

  it('should create an instance with status 422 and VALIDATION_ERROR code', () => {
    const error = new ValidationError(sampleIssues);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(422);
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Validation failed');
    expect(error.issues).toEqual(sampleIssues);
  });

  it('should merge issues into context and accept additional context', () => {
    const extra = { requestId: 'abc-123' };
    const error = new ValidationError(sampleIssues, extra);

    expect(error.context).toMatchObject({
      issues: sampleIssues,
      requestId: 'abc-123',
    });
  });

  it('should handle empty issues array', () => {
    const error = new ValidationError([]);
    expect(error.issues).toEqual([]);
    expect(error.context).toEqual({ issues: [] });
  });

  it('should override toJSON to include issues', () => {
    const error = new ValidationError(sampleIssues, { source: 'api' });
    const json = error.toJSON();

    expect(json).toMatchObject({
      name: 'ValidationError',
      message: 'Validation failed',
      status: 422,
      code: ErrorCode.VALIDATION_ERROR,
      issues: sampleIssues,
      context: {
        issues: sampleIssues,
        source: 'api',
      },
    });
    expect(json.stack).toBeDefined();
    expect(typeof json.stack).toBe('string');
  });

  it('should preserve prototype chain', () => {
    const error = new ValidationError(sampleIssues);
    expect(error instanceof ValidationError).toBe(true);
    expect(error instanceof AppError).toBe(true);
    expect(error.constructor).toBe(ValidationError);
  });
});
