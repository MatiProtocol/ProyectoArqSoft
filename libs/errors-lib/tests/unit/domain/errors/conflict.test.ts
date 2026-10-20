import { AppError } from '../../../../src/domain/app-error';
import { ErrorCode } from '../../../../src/domain/error-code';
import { ConflictError } from '../../../../src/domain/errors/conflict';

describe('ConflictError', () => {
  const defaultMessage = 'Resource conflict';

  it('should create an instance with status 409 and CONFLICT code', () => {
    const error = new ConflictError(defaultMessage);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(409);
    expect(error.code).toBe(ErrorCode.CONFLICT);
    expect(error.name).toBe('ConflictError');
    expect(error.message).toBe(defaultMessage);
  });

  it('should accept a context object', () => {
    const context = { existingId: 'abc-123', conflictingField: 'email' };
    const error = new ConflictError('Email already exists', context);

    expect(error.context).toEqual(context);
    expect(error.message).toBe('Email already exists');
  });

  it('should allow empty context', () => {
    const error = new ConflictError('Conflict');
    expect(error.context).toBeUndefined();
  });
});
