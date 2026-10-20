import type { Request } from 'express';

export function getCleanRoute(req: Request): string {
  let path = req.route?.path || req.path || req.url;

  path = path.replace(/\/[0-9a-f]{24}/g, '/:id');

  path = path.replace(/\/\d+/g, '/:id');

  return path;
}
