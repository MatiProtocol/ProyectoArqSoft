import { AppError } from '@move/errors-lib';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { withErrorFactory } from '../../../../src/presentation/middlewares/with-error-factory';

describe('withErrorFactory', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  it('calls next without an error when the middleware succeeds synchronously', () => {
    const middleware: RequestHandler = (_req, _res, nxt) => nxt();

    withErrorFactory(middleware)(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith();
  });

  it('passes an AppError through unchanged', () => {
    let capturedError: unknown;
    const middleware: RequestHandler = (_req, _res, nxt) => {
      try {
        throw new (class extends AppError {
          constructor() {
            super('boom', 422, 'TEAPOT' as never);
          }
        })();
      } catch (err) {
        capturedError = err;
        nxt(err);
      }
    };

    withErrorFactory(middleware)(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(capturedError);
  });

  it('maps a plain error with status 400 to a BadRequestError', () => {
    const middleware: RequestHandler = (_req, _res, nxt) => {
      nxt(Object.assign(new Error('bad input'), { status: 400 }));
    };

    withErrorFactory(middleware)(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 400, message: 'bad input' })
    );
  });

  it('maps a plain error with status 401 to an UnauthorizedError', () => {
    const middleware: RequestHandler = (_req, _res, nxt) => {
      nxt(Object.assign(new Error('no token'), { status: 401 }));
    };

    withErrorFactory(middleware)(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('maps a plain error with status 403 to a ForbiddenError', () => {
    const middleware: RequestHandler = (_req, _res, nxt) => {
      nxt(Object.assign(new Error('no role'), { status: 403 }));
    };

    withErrorFactory(middleware)(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });

  it('maps a plain error with status 400 and no message to a default bad request message', () => {
    const middleware: RequestHandler = (_req, _res, nxt) => {
      nxt(Object.assign(new Error(), { status: 400, message: '' }));
    };

    withErrorFactory(middleware)(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 400, message: 'Bad request' })
    );
  });

  it('maps an unrecognized status to an internal error via fromUnknown', () => {
    const middleware: RequestHandler = (_req, _res, nxt) => {
      nxt(Object.assign(new Error('weird'), { status: 999 }));
    };

    withErrorFactory(middleware)(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }));
  });

  it('maps a non-Error thrown value via fromUnknown', () => {
    const middleware: RequestHandler = (_req, _res, nxt) => {
      nxt('a plain string error');
    };

    withErrorFactory(middleware)(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }));
  });

  it('catches a synchronously thrown error from the middleware', () => {
    const middleware: RequestHandler = () => {
      throw Object.assign(new Error('sync failure'), { status: 401 });
    };

    withErrorFactory(middleware)(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('catches a rejected promise returned by an async middleware', async () => {
    const middleware: RequestHandler = async () => {
      throw Object.assign(new Error('async failure'), { status: 403 });
    };

    withErrorFactory(middleware)(req as Request, res as Response, next as NextFunction);
    await new Promise(process.nextTick);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });

  it('does not call next when the async middleware resolves successfully', async () => {
    const middleware: RequestHandler = async (_req, _res, nxt) => {
      nxt();
    };

    withErrorFactory(middleware)(req as Request, res as Response, next as NextFunction);
    await new Promise(process.nextTick);

    expect(next).toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
