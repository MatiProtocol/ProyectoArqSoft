import { Counter, Histogram } from 'prom-client';
import { register } from '../registry';

export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [register],
});
