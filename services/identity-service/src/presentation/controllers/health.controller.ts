import { isAuth0CircuitOpen, redisClient } from '@move/auth-lib';
import type { Request, Response } from 'express';

export async function healthHandler(_req: Request, res: Response): Promise<void> {
  const redisOk = redisClient.isOpen === true;

  const auth0Ok = !isAuth0CircuitOpen();

  const allOk = redisOk && auth0Ok;

  res.status(allOk ? 200 : 503).json({
    service: 'identity-service',
    status: allOk ? 'ok' : 'degraded',
    dependencies: {
      redis: redisOk ? 'up' : 'down',
      auth0: auth0Ok ? 'up' : 'down',
    },
  });
}
