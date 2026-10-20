import '../../../../src/metrics/metrics/business.metrics';
import { register } from '../../../../src/metrics/registry';

describe('business.metrics', () => {
  it('should register business metrics', async () => {
    const metrics = await register.getMetricsAsJSON();

    const metricNames = metrics.map((metric) => metric.name);

    expect(metricNames).toContain('business_events_total');
  });
});
