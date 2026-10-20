import { AppError } from '../../../../src/domain/app-error';
import { ErrorCode } from '../../../../src/domain/error-code';
import { NotFoundError } from '../../../../src/domain/errors/not-found';

describe('NotFoundError', () => {
  it('should create an instance with status 404 and NOT_FOUND code', () => {
    const error = new NotFoundError('User', '123');

    expect(error).toBeInstanceOf(NotFoundError);
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(404);
    expect(error.code).toBe(ErrorCode.NOT_FOUND);
    expect(error.name).toBe('NotFoundError');
  });

  it('should build message with resource only when identifier is not provided', () => {
    const error = new NotFoundError('Product');
    expect(error.message).toBe('Product not found');
    expect(error.context).toEqual({ resource: 'Product' });
  });

  it('should build message with resource and identifier when both are provided', () => {
    const error = new NotFoundError('User', 'abc-123');
    expect(error.message).toBe('User with identifier "abc-123" not found');
    expect(error.context).toEqual({ resource: 'User', identifier: 'abc-123' });
  });

  it('should accept numeric identifier', () => {
    const error = new NotFoundError('Order', 42);
    expect(error.message).toBe('Order with identifier "42" not found');
    expect(error.context).toEqual({ resource: 'Order', identifier: 42 });
  });

  it('should merge additional context with resource and identifier', () => {
    const extra = { reason: 'deleted', timestamp: Date.now() };
    const error = new NotFoundError('Invoice', 'INV-001', extra);
    expect(error.context).toMatchObject({
      resource: 'Invoice',
      identifier: 'INV-001',
      reason: 'deleted',
    });
    expect(error.context?.timestamp).toBeDefined();
  });

  it('should handle context without identifier', () => {
    const extra = { requestedBy: 'admin' };
    const error = new NotFoundError('Config', undefined, extra);
    expect(error.message).toBe('Config not found');
    expect(error.context).toMatchObject({
      resource: 'Config',
      requestedBy: 'admin',
    });
    expect(error.context?.identifier).toBeUndefined();
  });
});
