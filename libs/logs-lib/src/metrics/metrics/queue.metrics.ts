import { Gauge } from 'prom-client';
import { register } from '../registry';

export const queueSizeGauge = new Gauge({
  name: 'bull_queue_size',
  help: 'Current size of Bull queues',
  labelNames: ['queue_name', 'service'],
  registers: [register],
});
