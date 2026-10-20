import { redisClient } from '@move/auth-lib/dist/infrastructure/redis/client';
import { ErrorFactory } from '@move/errors-lib';
import { logger as defaultLogger, type ILogger } from '@move/logs-lib';
import CircuitBreaker from 'opossum';

const DEFAULT_ERROR_THRESHOLD_PERCENTAGE = 50;
const DEFAULT_RESET_TIMEOUT_MS = 30000;
const DEFAULT_ROLLING_COUNT_TIMEOUT_MS = 10000;
const DEFAULT_ROLLING_COUNT_BUCKETS = 10;
const REDIS_CIRCUIT_KEY_PREFIX = 'booking-service:circuit-breaker';
const REDIS_CIRCUIT_STATE_TTL_SECONDS = 60;
const KNOWN_CIRCUIT_NAMES = [
  'gemini',
  'categoryCatalog',
  'identityService',
  'gmail',
  'operatorWebhook',
  'osrm',
  'payment',
];

export type ExternalServiceCircuitState = 'closed' | 'open' | 'halfOpen';

export type ExternalServiceCircuitStatus = {
  name: string;
  state: ExternalServiceCircuitState;
};

export type ExternalServiceCircuitOptions = {
  name: string;
  serviceName: string;
  timeoutMs: number;
  fallbackMessage: string;
  retryAfter?: string;
};

export type ExternalServiceCircuitBreaker<T extends unknown[], R> = {
  fire(...args: T): Promise<R>;
  status(): ExternalServiceCircuitStatus;
  close(): void;
};

type RedisCircuitStateClient = {
  isOpen?: boolean;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX: number }): Promise<string | null>;
};

const registeredBreakers = new Map<string, ExternalServiceCircuitBreaker<unknown[], unknown>>();

export function createExternalServiceCircuitBreaker<T extends unknown[], R>(
  action: (...args: T) => Promise<R>,
  options: ExternalServiceCircuitOptions,
  logger: ILogger = defaultLogger
): ExternalServiceCircuitBreaker<T, R> {
  const breaker = new CircuitBreaker(action, {
    timeout: options.timeoutMs,
    errorThresholdPercentage: DEFAULT_ERROR_THRESHOLD_PERCENTAGE,
    resetTimeout: DEFAULT_RESET_TIMEOUT_MS,
    rollingCountTimeout: DEFAULT_ROLLING_COUNT_TIMEOUT_MS,
    rollingCountBuckets: DEFAULT_ROLLING_COUNT_BUCKETS,
    name: options.name,
  });

  breaker.fallback(() => {
    throw ErrorFactory.externalService(
      options.serviceName,
      options.fallbackMessage,
      undefined,
      options.retryAfter ? { retryAfter: options.retryAfter } : undefined
    );
  });

  breaker.on('open', () => {
    logger.warn(`[${options.name} Circuit Breaker] CIRCUIT OPENED`);
    void saveSharedCircuitState(options.name, 'open', logger);
  });

  breaker.on('halfOpen', () => {
    logger.info(`[${options.name} Circuit Breaker] Circuit half-open, testing...`);
    void saveSharedCircuitState(options.name, 'halfOpen', logger);
  });

  breaker.on('close', () => {
    logger.info(`[${options.name} Circuit Breaker] Circuit closed (service recovered)`);
    void saveSharedCircuitState(options.name, 'closed', logger);
  });

  breaker.on('fallback', () => {
    logger.warn(`[${options.name} Circuit Breaker] Fallback triggered`);
  });

  breaker.on('reject', (err) => {
    logger.warn(`[${options.name} Circuit Breaker] Request rejected`, { error: err });
  });

  breaker.on('timeout', (err) => {
    logger.error(`[${options.name} Circuit Breaker] Request timed out`, { error: err });
  });

  const circuitBreaker: ExternalServiceCircuitBreaker<T, R> = {
    fire: (...args: T) => breaker.fire(...args) as Promise<R>,
    status: () => ({
      name: options.name,
      state: getCircuitState(breaker),
    }),
    close: () => breaker.close(),
  };

  registeredBreakers.set(
    options.name,
    circuitBreaker as ExternalServiceCircuitBreaker<unknown[], unknown>
  );
  void saveSharedCircuitState(options.name, circuitBreaker.status().state, logger);

  return circuitBreaker;
}

export function getExternalServiceCircuitStatuses(): Record<string, ExternalServiceCircuitState> {
  const statuses = Object.fromEntries(
    KNOWN_CIRCUIT_NAMES.map((name) => [name, 'closed' as ExternalServiceCircuitState])
  );

  for (const [name, breaker] of registeredBreakers.entries()) {
    statuses[name] = breaker.status().state;
  }

  return statuses;
}

export async function getSharedExternalServiceCircuitStatuses(
  redis: RedisCircuitStateClient = redisClient as unknown as RedisCircuitStateClient
): Promise<Record<string, ExternalServiceCircuitState>> {
  const statuses = getExternalServiceCircuitStatuses();

  if (!redis.isOpen) {
    return statuses;
  }

  const circuitNames = new Set([...KNOWN_CIRCUIT_NAMES, ...registeredBreakers.keys()]);

  await Promise.all(
    [...circuitNames].map(async (name) => {
      const state = await redis.get(circuitStateKey(name));
      if (isCircuitState(state)) {
        statuses[name] = state;
      }
    })
  );

  return statuses;
}

export function resetExternalServiceCircuitRegistry(): void {
  registeredBreakers.clear();
}

function getCircuitState(breaker: CircuitBreaker): ExternalServiceCircuitState {
  if (breaker.opened) return 'open';
  if (breaker.halfOpen) return 'halfOpen';

  return 'closed';
}

async function saveSharedCircuitState(
  name: string,
  state: ExternalServiceCircuitState,
  logger: ILogger,
  redis: RedisCircuitStateClient = redisClient as unknown as RedisCircuitStateClient
): Promise<void> {
  if (!redis.isOpen) return;

  try {
    await redis.set(circuitStateKey(name), state, { EX: REDIS_CIRCUIT_STATE_TTL_SECONDS });
  } catch (error) {
    logger.warn(`[${name} Circuit Breaker] Could not save shared circuit state`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function circuitStateKey(name: string): string {
  return `${REDIS_CIRCUIT_KEY_PREFIX}:${name}:state`;
}

function isCircuitState(value: string | null): value is ExternalServiceCircuitState {
  return value === 'closed' || value === 'open' || value === 'halfOpen';
}
