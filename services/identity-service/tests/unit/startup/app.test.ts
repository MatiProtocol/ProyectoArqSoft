import type { NextFunction, Request, Response } from 'express';
import type { Db } from 'mongodb';

jest.mock('@move/logs-lib', () => ({
  metricsHandler: jest.fn(),
}));

jest.mock('@move/auth-lib', () => ({
  redisClient: {
    on: jest.fn(),
    connect: jest.fn(),
    isOpen: true,
  },
  validateJwt: jest.fn((_req, _res, next) => next()),
  ensureUserIdFromToken: jest.fn((_req, _res, next) => next()),
  isAuth0CircuitOpen: jest.fn(() => false),
}));

describe('app.ts', () => {
  let mockApp: any;
  let getMock: jest.Mock;
  let useMock: jest.Mock;

  let createIdentityRoutesMock: jest.Mock;
  const errorHandlerMock = jest.fn();
  const createErrorHandlerMock = jest.fn(() => errorHandlerMock);
  const envConfigFromProcessMock = jest.fn(() => ({ env: 'test', isDevelopment: false }));
  let metricsHandlerMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();

    getMock = jest.fn();
    useMock = jest.fn();

    mockApp = {
      get: getMock,
      use: useMock,
    };

    const expressMock = jest.fn(() => mockApp);
    const jsonMiddlewareMock = jest.fn(
      () => (_req: Request, _res: Response, next: NextFunction) => next()
    );

    (expressMock as any).json = jsonMiddlewareMock;
    createIdentityRoutesMock = jest.fn(() => 'identity-router');

    const { metricsHandler } = require('@move/logs-lib');
    metricsHandlerMock = metricsHandler as jest.Mock;

    jest.doMock('express', () => ({
      __esModule: true,
      default: expressMock,
      json: () => (_req: Request, _res: Response, next: NextFunction) => next(),
    }));

    jest.doMock('../../../src/presentation/routes/identity.routes', () => ({
      createIdentityRoutes: createIdentityRoutesMock,
    }));

    jest.doMock('@move/errors-lib', () => ({
      createErrorHandler: createErrorHandlerMock,
      envConfigFromProcess: envConfigFromProcessMock,
    }));
  });

  it('registers GET /health endpoint', () => {
    require('../../../src/app');

    expect(getMock).toHaveBeenCalledWith('/health', expect.any(Function));
  });

  it('health endpoint returns 200', () => {
    require('../../../src/app');

    const healthHandler = getMock.mock.calls.find(([path]: [string]) => path === '/health')[1];

    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const res = {
      status: statusMock,
      json: jsonMock,
    };

    healthHandler({}, res);

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

  it('registers GET / endpoint', () => {
    require('../../../src/app');

    expect(getMock).toHaveBeenCalledWith('/', expect.any(Function));
  });

  it('root endpoint returns ok', () => {
    require('../../../src/app');

    const rootHandler = getMock.mock.calls.find(([path]: [string]) => path === '/')[1];

    const res = {
      send: jest.fn(),
    };

    rootHandler({}, res);

    expect(res.send).toHaveBeenCalledWith('ok');
  });

  it('registers GET /metrics endpoint', () => {
    require('../../../src/app');

    expect(getMock).toHaveBeenCalledWith('/metrics', expect.any(Function));
  });

  it('metrics endpoint calls metricsHandler with req and res', () => {
    require('../../../src/app');

    const metricsHandlerFn = getMock.mock.calls.find(([path]: [string]) => path === '/metrics')[1];

    const req = {} as Request;
    const res = {} as Response;

    metricsHandlerMock.mockClear();

    metricsHandlerFn(req, res);

    expect(metricsHandlerMock).toHaveBeenCalledTimes(1);
    expect(metricsHandlerMock).toHaveBeenCalledWith(req, res);
  });

  describe('setupRoutes', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('creates identity routes using the provided db', () => {
      const { setupRoutes } = require('../../../src/app');

      const db = {} as Db;

      setupRoutes(db);

      expect(createIdentityRoutesMock).toHaveBeenCalledTimes(1);
      expect(createIdentityRoutesMock).toHaveBeenCalledWith(db);
    });

    it('registers identity routes under /api/v1/identity', () => {
      const { setupRoutes } = require('../../../src/app');

      const db = {} as Db;

      setupRoutes(db);

      expect(useMock).toHaveBeenCalledWith('/api/v1/identity', 'identity-router');
    });

    it('registers error middleware when setupRoutes is called', () => {
      const { setupRoutes } = require('../../../src/app');
      const db = {} as Db;

      setupRoutes(db);

      expect(useMock).toHaveBeenCalledWith(errorHandlerMock);
    });
  });
});
