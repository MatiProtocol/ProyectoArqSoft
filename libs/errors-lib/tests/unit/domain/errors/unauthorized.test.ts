import { AppError } from '../../../../src/domain/app-error';
import { ErrorCode } from '../../../../src/domain/error-code';
import { UnauthorizedError } from '../../../../src/domain/errors/unauthorized';

describe('UnauthorizedError', () => {
  const defaultMessage = 'Authentication required';

  it('should create an instance with status 401 and UNAUTHORIZED code', () => {
    const error = new UnauthorizedError();

    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(401);
    expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
    expect(error.name).toBe('UnauthorizedError');
  });

  it('should accept a custom message and context', () => {
    const customMessage = 'Invalid token';
    const context = { tokenExpired: true };
    const error = new UnauthorizedError(customMessage, context);

    expect(error.message).toBe(customMessage);
    expect(error.context).toEqual(context);
  });

  it('should use the default message when no message is provided', () => {
    const error = new UnauthorizedError();
    expect(error.message).toBe(defaultMessage);
  });
});
