import { UnauthorizedError } from '@move/errors-lib';
import type { NextFunction, Request, Response } from 'express';
import { requireInternalToken } from '../../../../src/presentation/middlewares/require-internal-token';

describe('requireInternalToken', () => {
  const env = { CONFIGURATION_INTERNAL_TOKEN: 'expected-token' } as NodeJS.ProcessEnv;
  let req: Request;
  let res: Response;
  let next: jest.Mock;

  beforeEach(() => {
    res = {} as Response;
    next = jest.fn();
  });

  it('should accept the configured internal token', () => {
    req = { header: jest.fn().mockReturnValue('expected-token') } as unknown as Request;

    requireInternalToken(env)(req, res, next as unknown as NextFunction);

    expect(next).toHaveBeenCalledWith();
  });

  it('should reject a missing token', () => {
    req = { header: jest.fn().mockReturnValue(undefined) } as unknown as Request;

    requireInternalToken(env)(req, res, next as unknown as NextFunction);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  it('should reject an invalid token', () => {
    req = { header: jest.fn().mockReturnValue('wrong-token') } as unknown as Request;

    requireInternalToken(env)(req, res, next as unknown as NextFunction);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  it('should reject requests when the expected token is not configured', () => {
    req = { header: jest.fn().mockReturnValue('any-token') } as unknown as Request;

    requireInternalToken({})(req, res, next as unknown as NextFunction);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });
});
