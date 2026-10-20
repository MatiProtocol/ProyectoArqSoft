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

jest.mock('../../../../src/infrastructure/config/env', () => ({
  env: {
    AUTH0_DOMAIN: 'test-domain.auth0.com',
    AUTH0_AUDIENCE: 'test-audience',
    CACHE_MAX_ENTRIES: 10,
    CACHE_MAX_AGE: 60000,
    TIMEOUT_CACHE: 5000,
  },
}));

jest.mock('@move/errors-lib');

import type { ExternalServiceError, UnauthorizedError } from '@move/errors-lib';
import { ErrorFactory } from '@move/errors-lib';
import jwt from 'jsonwebtoken';
import jwksClient, { type JwksClient } from 'jwks-rsa';
import { validateTokenWithAuth0 } from '../../../../src/infrastructure/auth/auth0-validator';
import { env } from '../../../../src/infrastructure/config/env';

const { mockGetSigningKey } = jest.requireMock('jwks-rsa');

describe('jwksClient configuration', () => {
  it('should create jwksClient with correct configuration', () => {
    expect(jwksClient).toHaveBeenCalledWith({
      jwksUri: `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`,
      cache: true,
      cacheMaxEntries: env.CACHE_MAX_ENTRIES,
      cacheMaxAge: env.CACHE_MAX_AGE,
      timeout: env.TIMEOUT_CACHE,
    });
  });
});

describe('validateTokenWithAuth0', () => {
  const mockUnauthorizedError = new Error('Unauthorized') as UnauthorizedError;
  const mockExternalServiceError = new Error('External service error') as ExternalServiceError;
  beforeAll(() => {
    jest.mocked(ErrorFactory.unauthorized).mockReturnValue(mockUnauthorizedError);
    jest.mocked(ErrorFactory.externalService).mockReturnValue(mockExternalServiceError);
  });

  let mockVerifyError: jwt.VerifyErrors | null = null;
  let mockGetKeyError: Error | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyError = null;
    mockGetKeyError = null;

    const mockClient: JwksClient = {
      getSigningKey: mockGetSigningKey,
      getKeys: jest.fn(),
      getSigningKeys: jest.fn(),
    };
    jest.mocked(jwksClient).mockImplementation(() => mockClient);

    mockGetSigningKey.mockImplementation(
      (
        _kid: string,
        callback: (err: Error | null, key?: { getPublicKey: () => string }) => void
      ) => {
        if (mockGetKeyError) {
          callback(mockGetKeyError, undefined);
        } else {
          const key = { getPublicKey: () => 'public-key' };
          callback(null, key);
        }
      }
    );

    (jwt.verify as jest.Mock).mockImplementation(
      (
        _token: string,
        getKey: jwt.GetPublicKeyOrSecret,
        _options: jwt.VerifyOptions,
        callback: jwt.VerifyCallback
      ) => {
        const header: jwt.JwtHeader = { kid: 'test-kid', alg: 'RS256' };
        const signingKeyCallback: jwt.SigningKeyCallback = (err, _signingKey) => {
          if (err) {
            callback(err as jwt.VerifyErrors);
            return;
          }
          callback(mockVerifyError);
        };
        getKey(header, signingKeyCallback);
      }
    );
  });

  const validToken = 'valid-token';

  it('should resolve when token is valid', async () => {
    mockVerifyError = null;
    await expect(validateTokenWithAuth0(validToken)).resolves.toBeUndefined();

    expect(jwt.verify).toHaveBeenCalledWith(
      validToken,
      expect.any(Function),
      {
        audience: env.AUTH0_AUDIENCE,
        issuer: `https://${env.AUTH0_DOMAIN}/`,
        algorithms: ['RS256'],
      },
      expect.any(Function)
    );
    expect(mockGetSigningKey).toHaveBeenCalledWith('test-kid', expect.any(Function));
    expect(ErrorFactory.unauthorized).not.toHaveBeenCalled();
    expect(ErrorFactory.externalService).not.toHaveBeenCalled();
  });

  it('should reject with unauthorized for TokenExpiredError', async () => {
    const expiredError = new Error('jwt expired') as jwt.TokenExpiredError;
    expiredError.name = 'TokenExpiredError';
    expiredError.expiredAt = new Date();
    mockVerifyError = expiredError;

    await expect(validateTokenWithAuth0(validToken)).rejects.toThrow(mockUnauthorizedError);
    expect(ErrorFactory.unauthorized).toHaveBeenCalledWith(expiredError.message);
    expect(ErrorFactory.externalService).not.toHaveBeenCalled();
  });

  it('should reject with unauthorized for JsonWebTokenError', async () => {
    const jwtError = new Error('invalid signature') as jwt.JsonWebTokenError;
    jwtError.name = 'JsonWebTokenError';
    mockVerifyError = jwtError;

    await expect(validateTokenWithAuth0(validToken)).rejects.toThrow(mockUnauthorizedError);
    expect(ErrorFactory.unauthorized).toHaveBeenCalledWith(jwtError.message);
  });

  it('should reject with unauthorized for NotBeforeError', async () => {
    const notBeforeError = new Error('jwt not active') as jwt.NotBeforeError;
    notBeforeError.name = 'NotBeforeError';
    notBeforeError.date = new Date();
    mockVerifyError = notBeforeError;

    await expect(validateTokenWithAuth0(validToken)).rejects.toThrow(mockUnauthorizedError);
    expect(ErrorFactory.unauthorized).toHaveBeenCalledWith(notBeforeError.message);
  });

  it('should reject with externalService unreachable for TimeoutError from jwt', async () => {
    const timeoutError = new Error('timeout') as jwt.VerifyErrors;
    timeoutError.name = 'TimeoutError';
    mockVerifyError = timeoutError;

    await expect(validateTokenWithAuth0(validToken)).rejects.toThrow(mockExternalServiceError);
    expect(ErrorFactory.externalService).toHaveBeenCalledWith(
      'Auth0',
      'Authentication service unreachable',
      timeoutError,
      { endpoint: `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json` }
    );
  });

  it('should reject with externalService unreachable for ECONNREFUSED code', async () => {
    const connError = new Error('connection refused') as jwt.VerifyErrors & { code?: string };
    connError.code = 'ECONNREFUSED';
    mockVerifyError = connError;

    await expect(validateTokenWithAuth0(validToken)).rejects.toThrow(mockExternalServiceError);
    expect(ErrorFactory.externalService).toHaveBeenCalledWith(
      'Auth0',
      'Authentication service unreachable',
      connError,
      { endpoint: `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json` }
    );
  });

  it('should reject with externalService unreachable for ETIMEDOUT code', async () => {
    const timeoutConnError = new Error('connection timeout') as jwt.VerifyErrors & {
      code?: string;
    };
    timeoutConnError.code = 'ETIMEDOUT';
    mockVerifyError = timeoutConnError;

    await expect(validateTokenWithAuth0(validToken)).rejects.toThrow(mockExternalServiceError);
    expect(ErrorFactory.externalService).toHaveBeenCalledWith(
      'Auth0',
      'Authentication service unreachable',
      timeoutConnError,
      { endpoint: `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json` }
    );
  });

  it('should reject with externalService unreachable when message includes "connect ECONNREFUSED"', async () => {
    const connError = new Error('connect ECONNREFUSED 127.0.0.1:443') as jwt.VerifyErrors;
    mockVerifyError = connError;

    await expect(validateTokenWithAuth0(validToken)).rejects.toThrow(mockExternalServiceError);
    expect(ErrorFactory.externalService).toHaveBeenCalledWith(
      'Auth0',
      'Authentication service unreachable',
      connError,
      { endpoint: `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json` }
    );
  });

  it('should reject with externalService unreachable when message includes "getaddrinfo ENOTFOUND"', async () => {
    const dnsError = new Error('getaddrinfo ENOTFOUND auth0.com') as jwt.VerifyErrors;
    mockVerifyError = dnsError;

    await expect(validateTokenWithAuth0(validToken)).rejects.toThrow(mockExternalServiceError);
    expect(ErrorFactory.externalService).toHaveBeenCalledWith(
      'Auth0',
      'Authentication service unreachable',
      dnsError,
      { endpoint: `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json` }
    );
  });

  it('should reject with generic externalService for other jwt errors', async () => {
    const otherError = new Error('some other error') as jwt.VerifyErrors;
    otherError.name = 'SomeOtherError';
    mockVerifyError = otherError;

    await expect(validateTokenWithAuth0(validToken)).rejects.toThrow(mockExternalServiceError);
    expect(ErrorFactory.externalService).toHaveBeenCalledWith(
      'Auth0',
      otherError.message,
      otherError
    );
  });

  it('should handle error from getSigningKey and reject with externalService', async () => {
    const getKeyError = new Error('JWKS fetch failed');
    mockGetKeyError = getKeyError;

    await expect(validateTokenWithAuth0(validToken)).rejects.toThrow(mockExternalServiceError);
    expect(ErrorFactory.externalService).toHaveBeenCalledWith(
      'Auth0',
      getKeyError.message,
      getKeyError
    );
    expect(mockGetSigningKey).toHaveBeenCalled();
  });

  it('should pass the correct audience and issuer to jwt.verify', async () => {
    mockVerifyError = null;
    await validateTokenWithAuth0(validToken);
    expect(jwt.verify).toHaveBeenCalledWith(
      validToken,
      expect.any(Function),
      {
        audience: env.AUTH0_AUDIENCE,
        issuer: `https://${env.AUTH0_DOMAIN}/`,
        algorithms: ['RS256'],
      },
      expect.any(Function)
    );
  });
});
