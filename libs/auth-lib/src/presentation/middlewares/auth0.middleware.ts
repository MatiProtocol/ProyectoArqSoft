import { AppError, ErrorFactory } from '@move/errors-lib';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { validateTokenWithAuth0Circuit } from '../../infrastructure/auth/auth0-circuit-breaker';

export async function validateJwt(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      next(ErrorFactory.unauthorized('Missing or invalid Authorization header'));
      return;
    }

    const token = authHeader.split(' ')[1];

    await validateTokenWithAuth0Circuit(token);

    const decoded = jwt.decode(token);
    if (typeof decoded === 'object' && decoded !== null && 'sub' in decoded) {
      req.user = { id: decoded.sub as string, roles: [] };
    } else {
      next(ErrorFactory.unauthorized('Ensure you are using a valid Auth0 access token'));
      return;
    }

    next();
  } catch (error) {
    next(error instanceof AppError ? error : ErrorFactory.fromUnknown(error));
  }
}

export function ensureUserIdFromToken(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.id) {
    next(ErrorFactory.badRequest('No user identifier in token'));
    return;
  }
  next();
}
