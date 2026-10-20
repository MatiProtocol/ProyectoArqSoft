jest.mock(
  '../../../../src/infrastructure/circuit-breakers/external-service-circuit-breaker',
  () => ({
    getSharedExternalServiceCircuitStatuses: jest.fn(),
  })
);

jest.mock('@move/auth-lib', () => ({
  isAuth0CircuitOpen: jest.fn().mockReturnValue(false),
}));

import { getSharedExternalServiceCircuitStatuses } from '../../../../src/infrastructure/circuit-breakers/external-service-circuit-breaker';
import { getBookingHealth } from '../../../../src/infrastructure/health/booking-health';

describe('getBookingHealth', () => {
  it('should return ok when all circuits are closed', async () => {
    (getSharedExternalServiceCircuitStatuses as jest.Mock).mockResolvedValue({
      gemini: 'closed',
      categoryCatalog: 'closed',
    });

    await expect(getBookingHealth()).resolves.toEqual({
      service: 'booking-service',
      status: 'ok',
      circuits: {
        gemini: 'closed',
        categoryCatalog: 'closed',
        auth0: 'closed',
      },
    });
  });

  it.each(['open', 'halfOpen'])('should return degraded when a circuit is %s', async (state) => {
    (getSharedExternalServiceCircuitStatuses as jest.Mock).mockResolvedValue({
      gemini: state,
      categoryCatalog: 'closed',
    });

    await expect(getBookingHealth()).resolves.toEqual({
      service: 'booking-service',
      status: 'degraded',
      circuits: {
        gemini: state,
        categoryCatalog: 'closed',
        auth0: 'closed',
      },
    });
  });
});
