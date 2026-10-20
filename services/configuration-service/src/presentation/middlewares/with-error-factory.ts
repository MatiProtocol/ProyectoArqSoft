import { AppError, ErrorFactory } from '@move/errors-lib';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }

  const status = err instanceof Error ? (err as Error & { status?: number }).status : undefined;
  const message = err instanceof Error ? err.message : undefined;

  switch (status) {
    case 400:
      return ErrorFactory.badRequest(message || 'Bad request');
    case 401:
      return ErrorFactory.unauthorized(message);
    case 403:
      return ErrorFactory.forbidden(message);
    default:
      return ErrorFactory.fromUnknown(err);
  }
}

export function withErrorFactory(middleware: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const normalizingNext: NextFunction = (err?: unknown) => {
      if (err) {
        next(toAppError(err));
        return;
      }
      next();
    };

    try {
      const result: unknown = middleware(req, res, normalizingNext);
      if (result instanceof Promise) {
        result.catch((err: unknown) => next(toAppError(err)));
      }
    } catch (err) {
      next(toAppError(err));
    }
  };
}
