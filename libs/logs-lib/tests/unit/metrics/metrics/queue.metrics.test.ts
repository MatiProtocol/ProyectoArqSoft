import '../../../../src/metrics/metrics/queue.metrics';
import { register } from '../../../../src/metrics/registry';

describe('queue.metrics', () => {
  it('should register business metrics', async () => {
    const metrics = await register.getMetricsAsJSON();

    const metricNames = metrics.map((metric) => metric.name);

    expect(metricNames).toContain('bull_queue_size');
  });
});
