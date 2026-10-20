import type { NextFunction, Request, Response } from 'express';
import { requireInternalToken } from '../../../../src/presentation/middlewares/require-internal-token';

describe('requireInternalToken', () => {
  const env = { IDENTITY_INTERNAL_TOKEN: 'expected-token' } as NodeJS.ProcessEnv;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    req = {
      header: jest.fn((name: string) =>
        name.toLowerCase() === 'x-internal-service-token' ? 'expected-token' : undefined
      ) as Request['header'],
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('should accept the configured internal token', () => {
    requireInternalToken(env)(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject missing or invalid token', () => {
    req.header = jest.fn(() => undefined);

    requireInternalToken(env)(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid internal service token' });
    expect(next).not.toHaveBeenCalled();
  });
});
