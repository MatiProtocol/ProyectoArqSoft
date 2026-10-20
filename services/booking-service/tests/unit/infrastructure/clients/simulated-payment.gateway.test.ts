import { SimulatedPaymentGateway } from '../../../../src/infrastructure/clients/simulated-payment.gateway';

describe('SimulatedPaymentGateway', () => {
  const config = { provider: 'stripe-sim', timeoutMs: 3000, defaultOutcome: 'accepted' as const };

  it('should return the accepted outcome when simulateOutcome is accepted', async () => {
    const gateway = new SimulatedPaymentGateway(config);

    const result = await gateway.charge({
      bookingId: 'bkg_1',
      amount: 100,
      methodToken: 'tok_1',
      simulateOutcome: 'accepted',
    });

    expect(result.outcome).toBe('accepted');
    expect(result.reference).toMatch(/^stripe-sim-/);
  });

  it('should return the rejected outcome when simulateOutcome is rejected', async () => {
    const gateway = new SimulatedPaymentGateway(config);

    const result = await gateway.charge({
      bookingId: 'bkg_1',
      amount: 100,
      methodToken: 'tok_1',
      simulateOutcome: 'rejected',
    });

    expect(result.outcome).toBe('rejected');
  });

  it('should return the pending outcome when simulateOutcome is pending', async () => {
    const gateway = new SimulatedPaymentGateway(config);

    const result = await gateway.charge({
      bookingId: 'bkg_1',
      amount: 100,
      methodToken: 'tok_1',
      simulateOutcome: 'pending',
    });

    expect(result.outcome).toBe('pending');
  });

  it('should throw when simulateOutcome is outage', async () => {
    const gateway = new SimulatedPaymentGateway(config);

    await expect(
      gateway.charge({
        bookingId: 'bkg_1',
        amount: 100,
        methodToken: 'tok_1',
        simulateOutcome: 'outage',
      })
    ).rejects.toThrow('Payment gateway is unavailable');
  });

  it('should fall back to the configured default outcome when simulateOutcome is not provided', async () => {
    const gateway = new SimulatedPaymentGateway({ ...config, defaultOutcome: 'rejected' });

    const result = await gateway.charge({
      bookingId: 'bkg_1',
      amount: 100,
      methodToken: 'tok_1',
    });

    expect(result.outcome).toBe('rejected');
  });

  it('should generate a unique reference per call', async () => {
    const gateway = new SimulatedPaymentGateway(config);

    const first = await gateway.charge({
      bookingId: 'bkg_1',
      amount: 100,
      methodToken: 'tok_1',
      simulateOutcome: 'accepted',
    });
    const second = await gateway.charge({
      bookingId: 'bkg_1',
      amount: 100,
      methodToken: 'tok_1',
      simulateOutcome: 'accepted',
    });

    expect(first.reference).not.toBe(second.reference);
  });
});
