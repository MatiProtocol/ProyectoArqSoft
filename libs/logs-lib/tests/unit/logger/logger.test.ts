jest.mock('winston');

import winston from 'winston';

import { createLogger } from '../../../src/logger/infrastructure/logger';

describe('createLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create logger with expected configuration', () => {
    const transports = [{} as winston.transport];

    createLogger(
      {
        serviceName: 'users',
        instanceId: '1',
        logLevel: 'debug',
        nodeEnv: 'development',
        logDirectory: '/logs',
        logMaxSize: '100m',
        logMaxFiles: '1d',
        fileLogLevel: 'debug',
      },
      transports
    );

    expect(winston.createLogger).toHaveBeenCalledWith({
      levels: {
        fatal: 0,
        error: 1,
        warn: 2,
        info: 3,
        debug: 4,
        trace: 5,
      },

      level: 'debug',

      defaultMeta: {
        service: 'users',
        instance: '1',
        pid: process.pid,
      },

      transports,

      exitOnError: false,
    });
  });

  it('should return created logger', () => {
    const mockLogger = { info: jest.fn() };

    (winston.createLogger as jest.Mock).mockReturnValue(mockLogger);

    const logger = createLogger(
      {
        serviceName: 'users',
        instanceId: '1',
        logLevel: 'info',
        nodeEnv: 'development',
        logDirectory: '/logs',
        logMaxSize: '100m',
        logMaxFiles: '1d',
        fileLogLevel: 'debug',
      },
      []
    );

    expect(logger).toBe(mockLogger);
  });
});
