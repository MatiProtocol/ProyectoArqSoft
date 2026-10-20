jest.mock('jsonwebtoken');
jest.mock('../../../../src/infrastructure/auth/auth0-circuit-breaker');

jest.mock('@move/errors-lib', () => {
  const actual = jest.requireActual('@move/errors-lib');
  return {
    ...actual,
    ErrorFactory: {
      ...actual.ErrorFactory,
      unauthorized: jest.fn().mockImplementation((msg) => actual.ErrorFactory.unauthorized(msg)),
      badRequest: jest.fn().mockImplementation((msg) => actual.ErrorFactory.badRequest(msg)),
      fromUnknown: jest.fn().mockImplementation((err) => actual.ErrorFactory.fromUnknown(err)),
    },
  };
});

import { ErrorFactory } from '@move/errors-lib';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { validateTokenWithAuth0Circuit } from '../../../../src/infrastructure/auth/auth0-circuit-breaker';
import {
  ensureUserIdFromToken,
  validateJwt,
} from '../../../../src/presentation/middlewares/auth0.middleware';

const mockValidateTokenWithAuth0Circuit = jest.mocked(validateTokenWithAuth0Circuit);
const mockErrorFactory = jest.mocked(ErrorFactory);
const mockJwtDecode = jest.mocked(jwt.decode);

describe('validateJwt middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      headers: {},
      user: { id: '', roles: [] },
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  it('should call next with unauthorized when Authorization header is missing', async () => {
    mockReq.headers = {};

    await validateJwt(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockErrorFactory.unauthorized).toHaveBeenCalledWith(
      'Missing or invalid Authorization header'
    );
    expect(mockValidateTokenWithAuth0Circuit).not.toHaveBeenCalled();
    expect(mockJwtDecode).not.toHaveBeenCalled();
  });

  it('should call next with unauthorized when Authorization header does not start with Bearer', async () => {
    mockReq.headers = {
      authorization: 'Basic token',
    };

    await validateJwt(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockErrorFactory.unauthorized).toHaveBeenCalledWith(
      'Missing or invalid Authorization header'
    );
    expect(mockValidateTokenWithAuth0Circuit).not.toHaveBeenCalled();
    expect(mockJwtDecode).not.toHaveBeenCalled();
  });

  it('should validate token with circuit breaker, decode it, set req.user.id, and call next when token is valid and sub exists', async () => {
    const token = 'valid-token';
    const sub = 'user_123';
    mockReq.headers = {
      authorization: `Bearer ${token}`,
    };
    mockValidateTokenWithAuth0Circuit.mockResolvedValue(undefined);
    mockJwtDecode.mockReturnValue({ sub });

    await validateJwt(mockReq as Request, mockRes as Response, mockNext);

    expect(mockValidateTokenWithAuth0Circuit).toHaveBeenCalledTimes(1);
    expect(mockValidateTokenWithAuth0Circuit).toHaveBeenCalledWith(token);
    expect(mockJwtDecode).toHaveBeenCalledTimes(1);
    expect(mockJwtDecode).toHaveBeenCalledWith(token);
    expect(mockReq.user?.id).toBe(sub);
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
    expect(mockErrorFactory.unauthorized).not.toHaveBeenCalled();
  });

  it('should call next with unauthorized when decoded token is not an object', async () => {
    const token = 'valid-token';
    mockReq.headers = {
      authorization: `Bearer ${token}`,
    };
    mockValidateTokenWithAuth0Circuit.mockResolvedValue(undefined);
    mockJwtDecode.mockReturnValue('string-token');

    await validateJwt(mockReq as Request, mockRes as Response, mockNext);

    expect(mockValidateTokenWithAuth0Circuit).toHaveBeenCalledWith(token);
    expect(mockJwtDecode).toHaveBeenCalledWith(token);
    expect(mockErrorFactory.unauthorized).toHaveBeenCalledWith(
      'Ensure you are using a valid Auth0 access token'
    );
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Ensure you are using a valid Auth0 access token' })
    );
  });

  it('should call next with unauthorized when decoded token is null', async () => {
    const token = 'valid-token';
    mockReq.headers = {
      authorization: `Bearer ${token}`,
    };
    mockValidateTokenWithAuth0Circuit.mockResolvedValue(undefined);
    mockJwtDecode.mockReturnValue(null);

    await validateJwt(mockReq as Request, mockRes as Response, mockNext);

    expect(mockValidateTokenWithAuth0Circuit).toHaveBeenCalledWith(token);
    expect(mockJwtDecode).toHaveBeenCalledWith(token);
    expect(mockErrorFactory.unauthorized).toHaveBeenCalledWith(
      'Ensure you are using a valid Auth0 access token'
    );
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Ensure you are using a valid Auth0 access token' })
    );
  });

  it('should call next with unauthorized when decoded token lacks sub property', async () => {
    const token = 'valid-token';
    mockReq.headers = {
      authorization: `Bearer ${token}`,
    };
    mockValidateTokenWithAuth0Circuit.mockResolvedValue(undefined);
    mockJwtDecode.mockReturnValue({ foo: 'bar' });

    await validateJwt(mockReq as Request, mockRes as Response, mockNext);

    expect(mockValidateTokenWithAuth0Circuit).toHaveBeenCalledWith(token);
    expect(mockJwtDecode).toHaveBeenCalledWith(token);
    expect(mockErrorFactory.unauthorized).toHaveBeenCalledWith(
      'Ensure you are using a valid Auth0 access token'
    );
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Ensure you are using a valid Auth0 access token' })
    );
  });

  it('should call next with the error when token validation throws an AppError', async () => {
    const token = 'invalid-token';
    const appError = ErrorFactory.unauthorized('Token expired');
    mockReq.headers = {
      authorization: `Bearer ${token}`,
    };
    mockValidateTokenWithAuth0Circuit.mockRejectedValue(appError);

    await validateJwt(mockReq as Request, mockRes as Response, mockNext);

    expect(mockValidateTokenWithAuth0Circuit).toHaveBeenCalledWith(token);
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(appError);
    expect(mockJwtDecode).not.toHaveBeenCalled();
    expect(mockErrorFactory.fromUnknown).not.toHaveBeenCalled();
  });

  it('should call next with ErrorFactory.fromUnknown when token validation throws a non-AppError', async () => {
    const token = 'invalid-token';
    const unknownError = new Error('Network error');
    const convertedError = ErrorFactory.unauthorized('Converted error');
    mockReq.headers = {
      authorization: `Bearer ${token}`,
    };
    mockValidateTokenWithAuth0Circuit.mockRejectedValue(unknownError);
    mockErrorFactory.fromUnknown.mockReturnValue(convertedError);

    await validateJwt(mockReq as Request, mockRes as Response, mockNext);

    expect(mockValidateTokenWithAuth0Circuit).toHaveBeenCalledWith(token);
    expect(mockErrorFactory.fromUnknown).toHaveBeenCalledWith(unknownError);
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(convertedError);
    expect(mockJwtDecode).not.toHaveBeenCalled();
  });

  it('should reject when fromUnknown throws inside catch', async () => {
    const token = 'invalid-token';
    const unknownError = new Error('Network error');
    const conversionError = new Error('Conversion failed');
    mockReq.headers = {
      authorization: `Bearer ${token}`,
    };
    mockValidateTokenWithAuth0Circuit.mockRejectedValue(unknownError);
    mockErrorFactory.fromUnknown.mockImplementation(() => {
      throw conversionError;
    });

    await expect(validateJwt(mockReq as Request, mockRes as Response, mockNext)).rejects.toThrow(
      conversionError
    );
    expect(mockValidateTokenWithAuth0Circuit).toHaveBeenCalledWith(token);
    expect(mockErrorFactory.fromUnknown).toHaveBeenCalledWith(unknownError);
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockJwtDecode).not.toHaveBeenCalled();
  });
});

describe('ensureUserIdFromToken', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockRes = {};
    mockNext = jest.fn();
  });

  it('should call next when req.user.id exists', () => {
    mockReq = {
      user: { id: 'user_123', roles: [] },
    };

    ensureUserIdFromToken(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
    expect(mockErrorFactory.badRequest).not.toHaveBeenCalled();
  });

  it('should call next with badRequest when req.user is undefined', () => {
    mockReq = {};

    ensureUserIdFromToken(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockErrorFactory.badRequest).toHaveBeenCalledWith('No user identifier in token');
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'No user identifier in token' })
    );
  });

  it('should call next with badRequest when req.user.id is undefined', () => {
    mockReq = {
      user: { id: undefined as unknown as string, roles: [] },
    };

    ensureUserIdFromToken(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockErrorFactory.badRequest).toHaveBeenCalledWith('No user identifier in token');
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'No user identifier in token' })
    );
  });

  it('should call next with badRequest when req.user.id is empty string', () => {
    mockReq = {
      user: { id: '', roles: [] },
    };

    ensureUserIdFromToken(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockErrorFactory.badRequest).toHaveBeenCalledWith('No user identifier in token');
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'No user identifier in token' })
    );
  });

  it('should call next with badRequest when req.user.id is null', () => {
    mockReq = {
      user: { id: null as unknown as string, roles: [] },
    };

    ensureUserIdFromToken(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockErrorFactory.badRequest).toHaveBeenCalledWith('No user identifier in token');
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'No user identifier in token' })
    );
  });
});
