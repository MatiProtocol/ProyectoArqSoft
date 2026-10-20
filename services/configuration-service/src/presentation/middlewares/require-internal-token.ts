import { ErrorFactory } from '@move/errors-lib';
import type { NextFunction, Request, Response } from 'express';

const INTERNAL_TOKEN_HEADER = 'x-internal-service-token';

export function requireInternalToken(
  env: NodeJS.ProcessEnv = process.env
): (req: Request, _res: Response, next: NextFunction) => void {
  return (req, _res, next) => {
    const expectedToken = env.CONFIGURATION_INTERNAL_TOKEN;
    const receivedToken = req.header(INTERNAL_TOKEN_HEADER);

    if (!expectedToken || receivedToken !== expectedToken) {
      next(ErrorFactory.unauthorized('Invalid internal service token'));
      return;
    }

    next();
  };
}
