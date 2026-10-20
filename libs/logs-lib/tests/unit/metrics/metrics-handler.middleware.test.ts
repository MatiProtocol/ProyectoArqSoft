import type { Request, Response } from 'express';
import { metricsHandler } from '../../../src/metrics/metrics-handler.middleware';
import { register } from '../../../src/metrics/registry';

jest.mock('../../../src/metrics/registry', () => ({
  register: {
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
    metrics: jest.fn().mockResolvedValue(''),
  },
}));

const metricsMock = register.metrics as jest.Mock<Promise<string>, []>;

describe('metricsHandler', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let sendMock: jest.Mock;
  let setMock: jest.Mock;

  beforeEach(() => {
    sendMock = jest.fn();
    setMock = jest.fn();
    res = {
      set: setMock,
      send: sendMock,
    };
    req = {};
    jest.clearAllMocks();
    metricsMock.mockResolvedValue('');
  });

  it('should set Content-Type header using register.contentType', async () => {
    await metricsHandler(req as Request, res as Response);

    expect(setMock).toHaveBeenCalledWith('Content-Type', register.contentType);
  });

  it('should send the metrics returned by register.metrics()', async () => {
    const fakeMetrics = '# HELP http_requests_total ...';
    metricsMock.mockResolvedValue(fakeMetrics);

    await metricsHandler(req as Request, res as Response);

    expect(metricsMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(fakeMetrics);
  });

  it('should handle empty metrics string', async () => {
    metricsMock.mockResolvedValue('');

    await metricsHandler(req as Request, res as Response);

    expect(sendMock).toHaveBeenCalledWith('');
  });
});
