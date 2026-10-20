import type { IncomingHttpHeaders } from 'node:http';
import type { NextFunction, Request, Response } from 'express';

jest.mock('../../../src/logger/context', () => ({
  runWithContext: jest.fn((_: string | undefined, cb: () => unknown) => cb()),
  getCurrentCorrelationId: jest.fn(),
}));

jest.mock('../../../src/logger/infrastructure/logger', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    log: jest.fn(),
  })),
}));

jest.mock('../../../src/config/env', () => ({
  getLoggerConfig: jest.fn(),
}));

jest.mock('../../../src/logger/infrastructure/transports', () => ({
  createTransports: jest.fn(),
}));

jest.mock('../../../src/metrics/helpers/http.helper', () => ({
  incrementHttp: jest.fn(),
  observeHttpDuration: jest.fn(),
}));

jest.mock('../../../src/logger/route.utils', () => ({
  getCleanRoute: jest.fn(),
}));

import { logger } from '../../../src/logger';
import { getCurrentCorrelationId, runWithContext } from '../../../src/logger/context';
import { requestLogger } from '../../../src/logger/request-logger.middleware';
import { getCleanRoute } from '../../../src/logger/route.utils';
import { incrementHttp, observeHttpDuration } from '../../../src/metrics/helpers/http.helper';

jest.mocked(runWithContext);
const mockedGetCurrentCorrelationId = jest.mocked(getCurrentCorrelationId);

jest.mocked(logger);
jest.mocked(incrementHttp);
jest.mocked(observeHttpDuration);
const mockedGetCleanRoute = jest.mocked(getCleanRoute);

type ReqMock = Partial<Request> & {
  correlationId?: string;
};

type ResMock = {
  statusCode: number;
  setHeader: jest.Mock;
  on: jest.Mock;
  _finish?: () => void;
};

function createReq(headers: IncomingHttpHeaders = {}): ReqMock {
  return {
    method: 'GET',
    url: '/users/123',
    headers,
    query: {},
    body: {},
  };
}

function createRes(): ResMock {
  const res: ResMock = {
    statusCode: 200,
    setHeader: jest.fn(),
    on: jest.fn((event: string, cb: () => void): ResMock => {
      if (event === 'finish') {
        res._finish = cb;
      }
      return res;
    }),
  };

  return res;
}

describe('requestLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockedGetCleanRoute.mockReturnValue('/users/:id');
    mockedGetCurrentCorrelationId.mockReturnValue('corr-id');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should attach correlation id and log request start', () => {
    const req = createReq({ 'x-correlation-id': 'corr-id' });
    const res = createRes();
    const next: NextFunction = jest.fn();

    requestLogger(req as unknown as Request, res as unknown as Response, next);

    expect(runWithContext).toHaveBeenCalled();

    expect(req.correlationId).toBe('corr-id');

    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'corr-id');

    expect(logger.debug).toHaveBeenCalledWith('→ GET /users/:id started', {
      query: {},
      body: {},
    });

    expect(next).toHaveBeenCalled();
  });

  it('should handle array correlation id header', () => {
    const req = createReq({ 'x-correlation-id': ['abc123'] });
    const res = createRes();
    const next: NextFunction = jest.fn();

    requestLogger(req as unknown as Request, res as unknown as Response, next);

    expect(req.correlationId).toBe('corr-id');

    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'corr-id');
  });

  it('should handle missing correlation header', () => {
    const req = createReq({});
    const res = createRes();
    const next: NextFunction = jest.fn();

    requestLogger(req as unknown as Request, res as unknown as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'corr-id');
  });

  it('should set empty header when correlation id is undefined', () => {
    mockedGetCurrentCorrelationId.mockReturnValue(undefined);

    const req = createReq({ 'x-correlation-id': 'corr-id' });
    const res = createRes();
    const next: NextFunction = jest.fn();

    requestLogger(req as unknown as Request, res as unknown as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', '');
  });

  it('should handle finish event and emit metrics', () => {
    const req = createReq({ 'x-correlation-id': 'corr-id' });
    const res = createRes();
    const next: NextFunction = jest.fn();

    requestLogger(req as unknown as Request, res as unknown as Response, next);

    res._finish?.();

    expect(incrementHttp).toHaveBeenCalledWith('GET', '/users/:id', 200);

    expect(observeHttpDuration).toHaveBeenCalledWith('GET', '/users/:id', 200, expect.any(Number));

    expect(logger.log).toHaveBeenCalledWith(
      'info',
      '← GET /users/:id completed',
      expect.objectContaining({
        statusCode: 200,
      })
    );
  });

  it('should log warn when status >= 400', () => {
    const req = createReq({ 'x-correlation-id': 'corr-id' });
    const res = createRes();
    res.statusCode = 500;

    const next: NextFunction = jest.fn();

    requestLogger(req as unknown as Request, res as unknown as Response, next);

    res._finish?.();

    expect(logger.log).toHaveBeenCalledWith('warn', expect.any(String), expect.any(Object));
  });
});
