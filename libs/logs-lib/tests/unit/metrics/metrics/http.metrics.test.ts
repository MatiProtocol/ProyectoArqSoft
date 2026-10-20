import '../../../../src/metrics/metrics/http.metrics';
import { register } from '../../../../src/metrics/registry';

describe('http.metrics', () => {
  it('should register http metrics', async () => {
    const metrics = await register.getMetricsAsJSON();

    const metricNames = metrics.map((metric) => metric.name);

    expect(metricNames).toContain('http_requests_total');
    expect(metricNames).toContain('http_request_duration_ms');
  });
});
