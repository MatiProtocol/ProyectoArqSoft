import { register } from '../../../src/metrics/registry';

describe('registry', () => {
  it('should expose a registry instance', () => {
    expect(register).toBeDefined();
  });

  it('should collect default metrics', async () => {
    const metrics = await register.getMetricsAsJSON();

    expect(metrics.length).toBeGreaterThan(0);
  });
});
