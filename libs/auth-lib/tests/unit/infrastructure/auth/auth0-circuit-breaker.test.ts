jest.mock('jsonwebtoken');

jest.mock('jwks-rsa', () => {
  const mockGetSigningKey = jest.fn();
  const mockClient = {
    getSigningKey: mockGetSigningKey,
    getKeys: jest.fn(),
    getSigningKeys: jest.fn(),
  };
  const jwksClientMock = jest.fn(() => mockClient);
  return {
    __esModule: true,
    default: jwksClientMock,
    mockGetSigningKey,
  };
});

const mockCircuitBreaker = {
  fire: jest.fn(),
  fallback: jest.fn(),
  on: jest.fn(),
  opened: false,
  close: jest.fn(),
  status: { stats: {} },
};

jest.mock('opossum', () => ({
  __esModule: true,
  default: jest.fn(() => mockCircuitBreaker),
}));

jest.mock('../../../../src/infrastructure/auth/auth0-validator');
jest.mock('@move/errors-lib');
jest.mock('@move/logs-lib');
jest.mock('../../../../src/infrastructure/config/env');

import { ErrorFactory, ExternalServiceError } from '@move/errors-lib';
import type { ILogger } from '@move/logs-lib';
import CircuitBreaker from 'opossum';
import {
  auth0Breaker,
  createAuth0Breaker,
  isAuth0CircuitOpen,
  resetAuth0Circuit,
  validateTokenWithAuth0Circuit,
} from '../../../../src/infrastructure/auth/auth0-circuit-breaker';
import { validateTokenWithAuth0 } from '../../../../src/infrastructure/auth/auth0-validator';
import { env } from '../../../../src/infrastructure/config/env';

const mockLogger: ILogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

(env as jest.Mocked<typeof env>).TIMEOUT_CIRCUIT_BREAKER = 5000;
(env as jest.Mocked<typeof env>).ERROR_THRESHOLD_PERCENTAGE_CIRCUIT_BREAKER = 50;
(env as jest.Mocked<typeof env>).RESET_TIMEOUT_CIRCUIT_BREAKER = 30000;
(env as jest.Mocked<typeof env>).ROLLING_COUNT_TIMEOUT_CIRCUIT_BREAKER = 10000;
(env as jest.Mocked<typeof env>).ROLLING_COUNT_BUCKETS_CIRCUIT_BREAKER = 10;
(env as jest.Mocked<typeof env>).NAME_CIRCUIT_BREAKER = 'auth0-validation';

const mockExternalServiceError = new Error('External service error') as ExternalServiceError;
(ErrorFactory.externalService as jest.Mock).mockReturnValue(mockExternalServiceError);

describe('Auth0 Circuit Breaker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCircuitBreaker.opened = false;
    mockCircuitBreaker.close.mockClear();
    mockCircuitBreaker.on.mockClear();
    (CircuitBreaker as unknown as jest.Mock).mockClear();
  });

  describe('createAuth0Breaker', () => {
    it('should create a CircuitBreaker with correct options', () => {
      const _breaker = createAuth0Breaker(mockLogger);

      expect(CircuitBreaker).toHaveBeenCalledWith(validateTokenWithAuth0, {
        timeout: env.TIMEOUT_CIRCUIT_BREAKER,
        errorThresholdPercentage: env.ERROR_THRESHOLD_PERCENTAGE_CIRCUIT_BREAKER,
        resetTimeout: env.RESET_TIMEOUT_CIRCUIT_BREAKER,
        rollingCountTimeout: env.ROLLING_COUNT_TIMEOUT_CIRCUIT_BREAKER,
        rollingCountBuckets: env.ROLLING_COUNT_BUCKETS_CIRCUIT_BREAKER,
        name: env.NAME_CIRCUIT_BREAKER,
        errorFilter: expect.any(Function),
      });
    });

    it('should count ExternalServiceError and ignore authentication errors in circuit breaker stats', () => {
      createAuth0Breaker(mockLogger);
      const optionsArg = (CircuitBreaker as unknown as jest.Mock).mock.calls[0][1];
      const errorFilter = optionsArg.errorFilter;

      const externalError = new ExternalServiceError('Auth0', 'Service error');
      const normalError = new Error('Normal error');

      expect(errorFilter(externalError)).toBe(false);
      expect(errorFilter(normalError)).toBe(true);
    });

    it('should not set an opossum fallback that hides token validation errors', () => {
      const _breaker = createAuth0Breaker(mockLogger);
      expect(mockCircuitBreaker.fallback).not.toHaveBeenCalled();
    });

    it('should register all event listeners with the logger', () => {
      const _breaker = createAuth0Breaker(mockLogger);

      expect(mockCircuitBreaker.on).toHaveBeenCalledTimes(6);
      expect(mockCircuitBreaker.on).toHaveBeenCalledWith('open', expect.any(Function));
      expect(mockCircuitBreaker.on).toHaveBeenCalledWith('halfOpen', expect.any(Function));
      expect(mockCircuitBreaker.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockCircuitBreaker.on).toHaveBeenCalledWith('fallback', expect.any(Function));
      expect(mockCircuitBreaker.on).toHaveBeenCalledWith('reject', expect.any(Function));
      expect(mockCircuitBreaker.on).toHaveBeenCalledWith('timeout', expect.any(Function));
    });

    it('should log correct messages on events', () => {
      const _breaker = createAuth0Breaker(mockLogger);

      const openHandler = mockCircuitBreaker.on.mock.calls.find((call) => call[0] === 'open')?.[1];
      const halfOpenHandler = mockCircuitBreaker.on.mock.calls.find(
        (call) => call[0] === 'halfOpen'
      )?.[1];
      const closeHandler = mockCircuitBreaker.on.mock.calls.find(
        (call) => call[0] === 'close'
      )?.[1];
      const fallbackHandler = mockCircuitBreaker.on.mock.calls.find(
        (call) => call[0] === 'fallback'
      )?.[1];
      const rejectHandler = mockCircuitBreaker.on.mock.calls.find(
        (call) => call[0] === 'reject'
      )?.[1];
      const timeoutHandler = mockCircuitBreaker.on.mock.calls.find(
        (call) => call[0] === 'timeout'
      )?.[1];

      openHandler?.();
      expect(mockLogger.warn).toHaveBeenCalledWith('[Auth0 Circuit Breaker] CIRCUIT OPENED');

      halfOpenHandler?.();
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[Auth0 Circuit Breaker] Circuit half-open, testing...'
      );

      closeHandler?.();
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[Auth0 Circuit Breaker] Circuit closed (service recovered)'
      );

      fallbackHandler?.();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[Auth0 Circuit Breaker] Fallback triggered (circuit open)'
      );

      const rejectError = new Error('rejected');
      rejectHandler?.(rejectError);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[Auth0 Circuit Breaker] Request rejected (circuit open)',
        { error: rejectError }
      );

      const timeoutError = new Error('timeout');
      timeoutHandler?.(timeoutError);
      expect(mockLogger.error).toHaveBeenCalledWith('[Auth0 Circuit Breaker] Request timed out', {
        error: timeoutError,
      });
    });

    it('should use default logger if none provided', () => {
      const _breaker = createAuth0Breaker();
      expect(mockCircuitBreaker.on).toHaveBeenCalled();
      expect(CircuitBreaker).toHaveBeenCalled();
    });
  });

  describe('isAuth0CircuitOpen', () => {
    it('should return the opened status of the exported breaker', () => {
      expect(auth0Breaker).toBe(mockCircuitBreaker);

      mockCircuitBreaker.opened = false;
      expect(isAuth0CircuitOpen()).toBe(false);

      mockCircuitBreaker.opened = true;
      expect(isAuth0CircuitOpen()).toBe(true);
    });
  });

  describe('resetAuth0Circuit', () => {
    it('should call close on the exported breaker', () => {
      expect(auth0Breaker).toBe(mockCircuitBreaker);
      resetAuth0Circuit();
      expect(mockCircuitBreaker.close).toHaveBeenCalled();
    });
  });

  describe('auth0Breaker export', () => {
    it('should be the same instance created by createAuth0Breaker', () => {
      expect(auth0Breaker).toBe(mockCircuitBreaker);
    });
  });

  describe('validateTokenWithAuth0Circuit', () => {
    it('should resolve when the circuit breaker call succeeds', async () => {
      mockCircuitBreaker.fire.mockResolvedValue(undefined);

      await expect(validateTokenWithAuth0Circuit('valid-token')).resolves.toBeUndefined();

      expect(mockCircuitBreaker.fire).toHaveBeenCalledWith('valid-token');
    });

    it('should propagate token validation errors without converting them to ExternalServiceError', async () => {
      const validationError = new Error('invalid token');
      mockCircuitBreaker.fire.mockRejectedValue(validationError);

      await expect(validateTokenWithAuth0Circuit('invalid-token')).rejects.toBe(validationError);
    });

    it('should throw ExternalServiceError when the circuit is already open', async () => {
      mockCircuitBreaker.opened = true;

      await expect(validateTokenWithAuth0Circuit('token')).rejects.toBe(mockExternalServiceError);

      expect(mockCircuitBreaker.fire).not.toHaveBeenCalled();
      expect(ErrorFactory.externalService).toHaveBeenCalledWith(
        'Auth0',
        'Authentication service is temporarily unavailable (circuit open)',
        undefined,
        { retryAfter: '30s' }
      );
    });

    it('should throw ExternalServiceError when opossum rejects because the breaker is open', async () => {
      const openBreakerError = Object.assign(new Error('Breaker is open'), {
        code: 'EOPENBREAKER',
      });
      mockCircuitBreaker.fire.mockRejectedValue(openBreakerError);

      await expect(validateTokenWithAuth0Circuit('token')).rejects.toBe(mockExternalServiceError);

      expect(ErrorFactory.externalService).toHaveBeenCalledWith(
        'Auth0',
        'Authentication service is temporarily unavailable (circuit open)',
        undefined,
        { retryAfter: '30s' }
      );
    });
  });
});
