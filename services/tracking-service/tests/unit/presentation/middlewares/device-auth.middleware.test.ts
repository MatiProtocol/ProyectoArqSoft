jest.mock('@move/logs-lib', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import type { NextFunction, Request, Response } from 'express';
import { deviceAuth } from '../../../../src/presentation/middlewares/device-auth.middleware';

describe('deviceAuth', () => {
  const config = { secret: 'super-secret' };
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      header: jest.fn(),
      body: { deviceId: 'GPS-001' },
      ip: '127.0.0.1',
    };
    res = {};
    next = jest.fn();
  });

  it('calls next without an error when the device secret matches', () => {
    (req.header as jest.Mock).mockReturnValue('super-secret');

    deviceAuth(config)(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects when the device secret header is missing', () => {
    (req.header as jest.Mock).mockReturnValue(undefined);

    deviceAuth(config)(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('rejects when the device secret does not match', () => {
    (req.header as jest.Mock).mockReturnValue('wrong-secret');

    deviceAuth(config)(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });
});
