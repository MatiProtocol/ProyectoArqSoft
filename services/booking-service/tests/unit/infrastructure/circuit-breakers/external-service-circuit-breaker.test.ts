const mockCircuitBreaker = {
  fire: jest.fn(),
  fallback: jest.fn(),
  on: jest.fn(),
  opened: false,
  halfOpen: false,
  close: jest.fn(),
};

jest.mock('opossum', () => ({
  __esModule: true,
  default: jest.fn(() => mockCircuitBreaker),
}));

const mockRedisClient = {
  isOpen: false,
  get: jest.fn(),
  set: jest.fn(),
};

jest.mock('@move/auth-lib/dist/infrastructure/redis/client', () => ({
  redisClient: mockRedisClient,
}));

jest.mock('@move/errors-lib', () => ({
  ErrorFactory: {
    externalService: jest.fn((serviceName: string, message: string) => {
      throw new Error(`External service "${serviceName}" failed: ${message}`);
    }),
  },
}));

import { ErrorFactory } from '@move/errors-lib';
import type { ILogger } from '@move/logs-lib';
import CircuitBreaker from 'opossum';
import {
  createExternalServiceCircuitBreaker,
  getExternalServiceCircuitStatuses,
  getSharedExternalServiceCircuitStatuses,
  resetExternalServiceCircuitRegistry,
} from '../../../../src/infrastructure/circuit-breakers/external-service-circuit-breaker';

const mockLogger: ILogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

describe('external-service-circuit-breaker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetExternalServiceCircuitRegistry();
    mockCircuitBreaker.opened = false;
    mockCircuitBreaker.halfOpen = false;
    mockRedisClient.isOpen = false;
  });

  it('should create an opossum breaker with standard options', () => {
    const action = jest.fn();

    createExternalServiceCircuitBreaker(action, baseOptions(), mockLogger);

    expect(CircuitBreaker).toHaveBeenCalledWith(action, {
      timeout: 1234,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      name: 'testService',
    });
  });

  it('should register fallback and event loggers', () => {
    createExternalServiceCircuitBreaker(jest.fn(), baseOptions(), mockLogger);

    expect(mockCircuitBreaker.fallback).toHaveBeenCalledWith(expect.any(Function));
    expect(mockCircuitBreaker.on).toHaveBeenCalledWith('open', expect.any(Function));
    expect(mockCircuitBreaker.on).toHaveBeenCalledWith('halfOpen', expect.any(Function));
    expect(mockCircuitBreaker.on).toHaveBeenCalledWith('close', expect.any(Function));
    expect(mockCircuitBreaker.on).toHaveBeenCalledWith('fallback', expect.any(Function));
    expect(mockCircuitBreaker.on).toHaveBeenCalledWith('reject', expect.any(Function));
    expect(mockCircuitBreaker.on).toHaveBeenCalledWith('timeout', expect.any(Function));
  });

  it('should throw an external service error from fallback', () => {
    createExternalServiceCircuitBreaker(jest.fn(), baseOptions(), mockLogger);
    const fallback = mockCircuitBreaker.fallback.mock.calls[0][0];

    expect(() => fallback()).toThrow(
      'External service "Test service" failed: Test service unavailable'
    );
    expect(ErrorFactory.externalService).toHaveBeenCalledWith(
      'Test service',
      'Test service unavailable',
      undefined,
      { retryAfter: '30s' }
    );
  });

  it('should expose registered circuit states', () => {
    createExternalServiceCircuitBreaker(jest.fn(), baseOptions(), mockLogger);

    expect(getExternalServiceCircuitStatuses()).toEqual({
      gemini: 'closed',
      categoryCatalog: 'closed',
      identityService: 'closed',
      gmail: 'closed',
      operatorWebhook: 'closed',
      testService: 'closed',
      osrm: 'closed',
      payment: 'closed',
    });

    mockCircuitBreaker.opened = true;
    expect(getExternalServiceCircuitStatuses()).toEqual({
      gemini: 'closed',
      categoryCatalog: 'closed',
      identityService: 'closed',
      gmail: 'closed',
      operatorWebhook: 'closed',
      testService: 'open',
      osrm: 'closed',
      payment: 'closed',
    });

    mockCircuitBreaker.opened = false;
    mockCircuitBreaker.halfOpen = true;
    expect(getExternalServiceCircuitStatuses()).toEqual({
      gemini: 'closed',
      categoryCatalog: 'closed',
      identityService: 'closed',
      gmail: 'closed',
      operatorWebhook: 'closed',
      testService: 'halfOpen',
      osrm: 'closed',
      payment: 'closed',
    });
  });

  it('should save circuit state changes in Redis when it is connected', async () => {
    mockRedisClient.isOpen = true;
    mockRedisClient.set.mockResolvedValue('OK');
    createExternalServiceCircuitBreaker(jest.fn(), baseOptions(), mockLogger);

    const openHandler = mockCircuitBreaker.on.mock.calls.find((call) => call[0] === 'open')?.[1];
    const halfOpenHandler = mockCircuitBreaker.on.mock.calls.find(
      (call) => call[0] === 'halfOpen'
    )?.[1];
    const closeHandler = mockCircuitBreaker.on.mock.calls.find((call) => call[0] === 'close')?.[1];

    openHandler?.();
    halfOpenHandler?.();
    closeHandler?.();

    await new Promise((resolve) => process.nextTick(resolve));

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'booking-service:circuit-breaker:testService:state',
      'closed',
      { EX: 60 }
    );
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'booking-service:circuit-breaker:testService:state',
      'open',
      { EX: 60 }
    );
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'booking-service:circuit-breaker:testService:state',
      'halfOpen',
      { EX: 60 }
    );
  });

  it('should merge Redis circuit states into the health status', async () => {
    mockRedisClient.isOpen = true;
    mockRedisClient.get.mockImplementation((key: string) => {
      if (key === 'booking-service:circuit-breaker:gemini:state') {
        return Promise.resolve('open');
      }

      return Promise.resolve(null);
    });

    await expect(getSharedExternalServiceCircuitStatuses()).resolves.toMatchObject({
      gemini: 'open',
      categoryCatalog: 'closed',
      identityService: 'closed',
      gmail: 'closed',
      operatorWebhook: 'closed',
    });
  });

  it('should delegate fire and close to opossum', async () => {
    mockCircuitBreaker.fire.mockResolvedValueOnce('ok');
    const breaker = createExternalServiceCircuitBreaker(jest.fn(), baseOptions(), mockLogger);

    await expect(breaker.fire('arg' as never)).resolves.toBe('ok');
    breaker.close();

    expect(mockCircuitBreaker.fire).toHaveBeenCalledWith('arg');
    expect(mockCircuitBreaker.close).toHaveBeenCalledTimes(1);
  });

  function baseOptions() {
    return {
      name: 'testService',
      serviceName: 'Test service',
      timeoutMs: 1234,
      fallbackMessage: 'Test service unavailable',
      retryAfter: '30s',
    };
  }
});
