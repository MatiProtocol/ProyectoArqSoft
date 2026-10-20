import { isAuth0CircuitOpen, redisClient } from '@move/auth-lib';
import type { Request, Response } from 'express';
import { healthHandler } from '../../../../src/presentation/controllers/health.controller';

jest.mock('@move/auth-lib', () => ({
  redisClient: {
    isOpen: true,
  },
  isAuth0CircuitOpen: jest.fn(),
}));

const mockedRedisClient = jest.mocked(redisClient);
const mockedIsAuth0CircuitOpen = jest.mocked(isAuth0CircuitOpen);

describe('healthHandler', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = {};
    res = {
      status: statusMock,
    };
    jest.clearAllMocks();
  });

  it('should return 200 and status ok when all dependencies are up', async () => {
    mockedRedisClient.isOpen = true;
    mockedIsAuth0CircuitOpen.mockReturnValue(false);

    await healthHandler(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      service: 'identity-service',
      status: 'ok',
      dependencies: {
        redis: 'up',
        auth0: 'up',
      },
    });
  });

  it('should return 503 and status degraded when redis is down', async () => {
    mockedRedisClient.isOpen = false;
    mockedIsAuth0CircuitOpen.mockReturnValue(false);

    await healthHandler(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(503);
    expect(jsonMock).toHaveBeenCalledWith({
      service: 'identity-service',
      status: 'degraded',
      dependencies: {
        redis: 'down',
        auth0: 'up',
      },
    });
  });

  it('should return 503 and status degraded when auth0 circuit is open', async () => {
    mockedRedisClient.isOpen = true;
    mockedIsAuth0CircuitOpen.mockReturnValue(true);

    await healthHandler(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(503);
    expect(jsonMock).toHaveBeenCalledWith({
      service: 'identity-service',
      status: 'degraded',
      dependencies: {
        redis: 'up',
        auth0: 'down',
      },
    });
  });

  it('should return 503 and status degraded when both dependencies are down', async () => {
    mockedRedisClient.isOpen = false;
    mockedIsAuth0CircuitOpen.mockReturnValue(true);

    await healthHandler(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(503);
    expect(jsonMock).toHaveBeenCalledWith({
      service: 'identity-service',
      status: 'degraded',
      dependencies: {
        redis: 'down',
        auth0: 'down',
      },
    });
  });
});
