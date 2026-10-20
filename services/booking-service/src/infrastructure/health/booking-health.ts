import { isAuth0CircuitOpen } from '@move/auth-lib';
import {
  type ExternalServiceCircuitState,
  getSharedExternalServiceCircuitStatuses,
} from '../circuit-breakers/external-service-circuit-breaker';

export type BookingHealthStatus = {
  service: 'booking-service';
  status: 'ok' | 'degraded';
  circuits: Record<string, ExternalServiceCircuitState>;
};

export async function getBookingHealth(): Promise<BookingHealthStatus> {
  const circuits = await getSharedExternalServiceCircuitStatuses();

  circuits['auth0'] = isAuth0CircuitOpen() ? 'open' : 'closed';

  const isDegraded = Object.values(circuits).some((state) => state !== 'closed');

  return {
    service: 'booking-service',
    status: isDegraded ? 'degraded' : 'ok',
    circuits,
  };
}
