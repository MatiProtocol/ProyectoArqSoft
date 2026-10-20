import type { IncomingHttpHeaders } from 'node:http';
import type { NextFunction, Request, Response } from 'express';
import { incrementHttp, observeHttpDuration } from '../metrics/helpers/http.helper';
import { getCurrentCorrelationId, runWithContext } from './context';
import { logger } from './index';
import { getCleanRoute } from './route.utils';

function getCorrelationIdFromHeader(headers: IncomingHttpHeaders): string | undefined {
  const value = headers['x-correlation-id'];

  if (!value) return undefined;

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const correlationId = getCorrelationIdFromHeader(req.headers);

  const start = Date.now();

  runWithContext(correlationId, () => {
    const currentId = getCurrentCorrelationId();

    req.correlationId = currentId;
    res.setHeader('X-Correlation-ID', currentId ?? '');

    const method = req.method;
    const route = getCleanRoute(req);

    logger.debug(`→ ${method} ${route} started`, {
      query: req.query,
      body: req.body,
    });

    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;

      incrementHttp(method, route, status);
      observeHttpDuration(method, route, status, duration);

      logger.log(status >= 400 ? 'warn' : 'info', `← ${method} ${route} completed`, {
        statusCode: status,
        durationMs: duration,
      });
    });

    next();
  });
}
