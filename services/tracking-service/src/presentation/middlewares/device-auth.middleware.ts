import { ErrorFactory } from '@move/errors-lib';
import { logger } from '@move/logs-lib';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { DeviceAuthConfig } from '../../infrastructure/config/device-auth';

const DEVICE_SECRET_HEADER = 'x-device-secret';

export function deviceAuth(config: DeviceAuthConfig): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const providedSecret = req.header(DEVICE_SECRET_HEADER);

    if (!providedSecret || providedSecret !== config.secret) {
      logger.warn('Rejected GPS request with invalid device secret', {
        ip: req.ip,
        deviceId: (req.body as { deviceId?: unknown })?.deviceId,
      });
      next(ErrorFactory.unauthorized('Invalid device credentials'));
      return;
    }

    next();
  };
}
