import { ErrorFactory, ExternalServiceError } from '@move/errors-lib';
import { logger as defaultLogger, type ILogger } from '@move/logs-lib';
import CircuitBreaker from 'opossum';
import { env } from '../config/env';
import { validateTokenWithAuth0 } from './auth0-validator';

const options: CircuitBreaker.Options = {
  timeout: env.TIMEOUT_CIRCUIT_BREAKER,
  errorThresholdPercentage: env.ERROR_THRESHOLD_PERCENTAGE_CIRCUIT_BREAKER,
  resetTimeout: env.RESET_TIMEOUT_CIRCUIT_BREAKER,
  rollingCountTimeout: env.ROLLING_COUNT_TIMEOUT_CIRCUIT_BREAKER,
  rollingCountBuckets: env.ROLLING_COUNT_BUCKETS_CIRCUIT_BREAKER,
  name: env.NAME_CIRCUIT_BREAKER,
  errorFilter: (error) => !(error instanceof ExternalServiceError),
};

function createAuth0Breaker(logger: ILogger = defaultLogger): CircuitBreaker {
  const breaker = new CircuitBreaker(validateTokenWithAuth0, options);

  breaker.on('open', () => {
    logger.warn('[Auth0 Circuit Breaker] CIRCUIT OPENED');
  });

  breaker.on('halfOpen', () => {
    logger.info('[Auth0 Circuit Breaker] Circuit half-open, testing...');
  });

  breaker.on('close', () => {
    logger.info('[Auth0 Circuit Breaker] Circuit closed (service recovered)');
  });

  breaker.on('fallback', () => {
    logger.warn('[Auth0 Circuit Breaker] Fallback triggered (circuit open)');
  });

  breaker.on('reject', (err) => {
    logger.warn('[Auth0 Circuit Breaker] Request rejected (circuit open)', { error: err });
  });

  breaker.on('timeout', (err) => {
    logger.error('[Auth0 Circuit Breaker] Request timed out', { error: err });
  });

  return breaker;
}

export const auth0Breaker = createAuth0Breaker();

export function isAuth0CircuitOpen(): boolean {
  return auth0Breaker.opened;
}

export function resetAuth0Circuit(): void {
  auth0Breaker.close();
}

export async function validateTokenWithAuth0Circuit(token: string): Promise<void> {
  if (auth0Breaker.opened) {
    throw createAuth0CircuitOpenError();
  }

  try {
    await auth0Breaker.fire(token);
  } catch (error) {
    if (isCircuitOpenError(error)) {
      throw createAuth0CircuitOpenError();
    }

    throw error;
  }
}

function createAuth0CircuitOpenError(): ExternalServiceError {
  return ErrorFactory.externalService(
    'Auth0',
    'Authentication service is temporarily unavailable (circuit open)',
    undefined,
    { retryAfter: '30s' }
  );
}

function isCircuitOpenError(error: unknown): boolean {
  return (
    error instanceof Error &&
    ('code' in error || 'message' in error) &&
    ((error as { code?: unknown }).code === 'EOPENBREAKER' ||
      error.message.toLowerCase().includes('breaker is open'))
  );
}

export { createAuth0Breaker };
