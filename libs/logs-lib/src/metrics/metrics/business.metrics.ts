import { Counter } from 'prom-client';
import { register } from '../registry';

export const businessEventCounter = new Counter({
  name: 'business_events_total',
  help: 'Total business events',
  labelNames: ['event_type', 'category', 'service'],
  registers: [register],
});
