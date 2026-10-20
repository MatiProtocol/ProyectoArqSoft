import type { NextFunction, Request, Response } from 'express';

const INTERNAL_TOKEN_HEADER = 'x-internal-service-token';

export function requireInternalToken(
  env: NodeJS.ProcessEnv = process.env
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const expectedToken = env.IDENTITY_INTERNAL_TOKEN;
    const receivedToken = req.header(INTERNAL_TOKEN_HEADER);

    if (!expectedToken || receivedToken !== expectedToken) {
      res.status(401).json({ error: 'Invalid internal service token' });
      return;
    }

    next();
  };
}
