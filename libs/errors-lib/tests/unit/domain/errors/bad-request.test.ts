import { AppError } from '../../../../src/domain/app-error';
import { ErrorCode } from '../../../../src/domain/error-code';
import { BadRequestError } from '../../../../src/domain/errors/bad-request';

describe('BadRequestError', () => {
  const defaultMessage = 'Invalid request';

  it('should create an instance with correct status, code and name', () => {
    const error = new BadRequestError(defaultMessage);

    expect(error).toBeInstanceOf(BadRequestError);
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(400);
    expect(error.code).toBe(ErrorCode.BAD_REQUEST);
    expect(error.name).toBe('BadRequestError');
  });

  it('should accept a context object and pass it to AppError', () => {
    const context = { field: 'email', error: 'invalid' };
    const error = new BadRequestError('Validation error', context);

    expect(error.context).toEqual(context);
    expect(error.message).toBe('Validation error');
  });
});
