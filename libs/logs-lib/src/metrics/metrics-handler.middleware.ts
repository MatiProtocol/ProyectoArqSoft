import type { Request, Response } from 'express';
import { register } from './registry';

export async function metricsHandler(_req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  const metrics = await register.metrics();
  res.send(metrics);
}
