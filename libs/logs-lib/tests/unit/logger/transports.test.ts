import fs from 'node:fs';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import { createTransports } from '../../../src/logger/infrastructure/transports';

jest.mock('winston', () => ({
  __esModule: true,
  default: {
    format: {
      combine: jest.fn(() => 'combined'),
      timestamp: jest.fn(() => 'timestamp'),
      json: jest.fn(() => 'json'),
    },
    transports: {
      Console: jest.fn(() => ({})),
    },
    createLogger: jest.fn(),
  },
}));

jest.mock('winston-daily-rotate-file', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));

describe('createTransports', () => {
  const config = {
    serviceName: 'users',
    instanceId: '0',
    logLevel: 'info',
    nodeEnv: 'development',
    logDirectory: '/logs',
    logMaxSize: '100m',
    logMaxFiles: '1d',
    fileLogLevel: 'debug',
  };
  let mkdirSyncSpy: jest.SpyInstance;

  beforeEach(() => {
    mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);

    jest.clearAllMocks();
  });

  afterEach(() => {
    mkdirSyncSpy.mockRestore();
  });

  it('should always create console transport', () => {
    createTransports(config);

    expect(winston.transports.Console).toHaveBeenCalledTimes(1);
  });

  it('should create log directory outside test environment', () => {
    createTransports(config);

    expect(mkdirSyncSpy).toHaveBeenCalledWith('/logs', { recursive: true });
  });

  it('should create daily rotate transport outside test environment', () => {
    createTransports(config);

    expect(DailyRotateFile).toHaveBeenCalledTimes(1);

    expect(DailyRotateFile).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: expect.stringContaining('users-%DATE%.log'),
        level: 'debug',
      })
    );
  });

  it('should create daily rotate transport with logLevel if fileLogLevel is undefined', () => {
    config.fileLogLevel = '';
    createTransports(config);

    expect(DailyRotateFile).toHaveBeenCalledTimes(1);

    expect(DailyRotateFile).toHaveBeenCalledWith(
      expect.objectContaining({
        level: config.logLevel,
      })
    );
  });

  it('should not create file transport during tests', () => {
    createTransports({
      ...config,
      nodeEnv: 'test',
    });

    expect(fs.mkdirSync).not.toHaveBeenCalled();

    expect(DailyRotateFile).not.toHaveBeenCalled();
  });
});
