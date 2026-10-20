import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  UnauthorizedError,
} from '@move/errors-lib';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { withErrorFactory } from '../../../../src/presentation/middlewares/with-error-factory';

describe('withErrorFactory', () => {
  let req: Request;
  let res: Response;
  let next: jest.Mock;

  beforeEach(() => {
    req = {} as Request;
    res = {} as Response;
    next = jest.fn();
  });

  it('calls next() with no args when the wrapped middleware succeeds', () => {
    const middleware: RequestHandler = (_req, _res, nextFn) => nextFn();

    withErrorFactory(middleware)(req, res, next as unknown as NextFunction);

    expect(next).toHaveBeenCalledWith();
  });

  it('converts a synchronously thrown 400 error into a BadRequestError', () => {
    const middleware: RequestHandler = () => {
      throw Object.assign(new Error('bad input'), { status: 400 });
    };

    withErrorFactory(middleware)(req, res, next as unknown as NextFunction);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err.message).toBe('bad input');
  });

  it('converts a synchronously thrown 401 error into an UnauthorizedError', () => {
    const middleware: RequestHandler = () => {
      throw Object.assign(new Error('no auth'), { status: 401 });
    };

    withErrorFactory(middleware)(req, res, next as unknown as NextFunction);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(err.message).toBe('no auth');
  });

  it('converts a synchronously thrown 403 error into a ForbiddenError', () => {
    const middleware: RequestHandler = () => {
      throw Object.assign(new Error('forbidden'), { status: 403 });
    };

    withErrorFactory(middleware)(req, res, next as unknown as NextFunction);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ForbiddenError);
    expect(err.message).toBe('forbidden');
  });

  it('converts a thrown error without a known status into an InternalServerError', () => {
    const middleware: RequestHandler = () => {
      throw new Error('boom');
    };

    withErrorFactory(middleware)(req, res, next as unknown as NextFunction);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(InternalServerError);
  });

  it('converts a non-Error thrown value into an InternalServerError', () => {
    const middleware: RequestHandler = () => {
      throw 'not an error object';
    };

    withErrorFactory(middleware)(req, res, next as unknown as NextFunction);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(InternalServerError);
  });

  it('falls back to a default message when a 400 error has no message', () => {
    const middleware: RequestHandler = () => {
      const err = Object.assign(new Error(), { status: 400 });
      err.message = '';
      throw err;
    };

    withErrorFactory(middleware)(req, res, next as unknown as NextFunction);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err.message).toBe('Bad request');
  });

  it('passes an already-AppError instance through unchanged', () => {
    const original = new ForbiddenError('nope');
    const middleware: RequestHandler = () => {
      throw original;
    };

    withErrorFactory(middleware)(req, res, next as unknown as NextFunction);

    expect(next).toHaveBeenCalledWith(original);
  });

  it('normalizes an error forwarded via next(err)', () => {
    const middleware: RequestHandler = (_req, _res, nextFn) => {
      nextFn(Object.assign(new Error('via next'), { status: 403 }));
    };

    withErrorFactory(middleware)(req, res, next as unknown as NextFunction);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ForbiddenError);
    expect(err.message).toBe('via next');
  });

  it('normalizes a rejected promise returned by an async middleware', async () => {
    const middleware: RequestHandler = async () => {
      throw Object.assign(new Error('async fail'), { status: 401 });
    };

    withErrorFactory(middleware)(req, res, next as unknown as NextFunction);
    await new Promise((resolve) => setImmediate(resolve));

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(err.message).toBe('async fail');
  });
});
