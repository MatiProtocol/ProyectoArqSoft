import { AppError } from '../../../../src/domain/app-error';
import { ErrorCode } from '../../../../src/domain/error-code';
import { InternalServerError } from '../../../../src/domain/errors/internal-server';

describe('InternalServerError', () => {
  const defaultMessage = 'Internal server error';

  it('should create an instance with status 500 and INTERNAL_SERVER_ERROR code', () => {
    const error = new InternalServerError();

    expect(error).toBeInstanceOf(InternalServerError);
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(500);
    expect(error.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    expect(error.name).toBe('InternalServerError');
    expect(error.message).toBe(defaultMessage);
    expect(error.context).toBeUndefined();
  });

  it('should accept a custom message and context', () => {
    const customMessage = 'Database connection failed';
    const context = { query: 'SELECT * FROM users' };
    const error = new InternalServerError(customMessage, context);

    expect(error.message).toBe(customMessage);
    expect(error.context).toEqual(context);
  });

  it('should use the default message when no message is provided', () => {
    const error = new InternalServerError();
    expect(error.message).toBe(defaultMessage);
  });

  it('should set isOperational to false', () => {
    const error = new InternalServerError();
    expect(error.isOperational).toBe(false);
  });

  it('should preserve prototype chain', () => {
    const error = new InternalServerError();
    expect(error instanceof InternalServerError).toBe(true);
    expect(error instanceof AppError).toBe(true);
    expect(error.constructor).toBe(InternalServerError);
  });
});
