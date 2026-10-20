import { AppError } from '../../../../src/domain/app-error';
import { ErrorCode } from '../../../../src/domain/error-code';
import { ForbiddenError } from '../../../../src/domain/errors/forbidden';

describe('ForbiddenError', () => {
  const defaultMessage = 'Insufficient permissions';

  it('should create an instance with status 403 and FORBIDDEN code', () => {
    const error = new ForbiddenError();

    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(403);
    expect(error.code).toBe(ErrorCode.FORBIDDEN);
    expect(error.name).toBe('ForbiddenError');
    expect(error.context).toBeUndefined();
  });

  it('should accept a custom message and context', () => {
    const customMessage = 'Access denied';
    const context = { resource: '/admin' };
    const error = new ForbiddenError(customMessage, context);

    expect(error.message).toBe(customMessage);
    expect(error.context).toEqual(context);
  });

  it('should use the default message when no message is provided', () => {
    const error = new ForbiddenError();
    expect(error.message).toBe(defaultMessage);
  });
});
