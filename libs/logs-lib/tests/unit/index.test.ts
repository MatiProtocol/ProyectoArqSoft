jest.mock('uuid', () => ({ v4: jest.fn() }), { virtual: true });

import * as logsLib from '../../src/index';

import { logger as originalLogger } from '../../src/logger/index';
import { register as originalRegister } from '../../src/metrics/registry';

const EXPECTED_LOGGER_METHODS = ['debug', 'info', 'warn', 'error', 'log'] as const;

describe('@move/logs-lib', () => {
  it('exports buildHttpClient factory function', () => {
    expect(logsLib.buildHttpClient).toBeDefined();
    expect(typeof logsLib.buildHttpClient).toBe('function');
  });

  it('exports logger with standard methods', () => {
    expect(logsLib.logger).toBeDefined();
    expect(typeof logsLib.logger).toBe('object');
    expect(logsLib.logger.debug).toBeDefined();
    expect(typeof logsLib.logger.debug).toBe('function');
    expect(logsLib.logger.info).toBeDefined();
    expect(typeof logsLib.logger.info).toBe('function');
    expect(logsLib.logger.error).toBeDefined();
    expect(typeof logsLib.logger.error).toBe('function');
    expect(logsLib.logger).toBe(originalLogger);
  });

  it('exports requestLogger middleware', () => {
    expect(logsLib.requestLogger).toBeDefined();
    expect(typeof logsLib.requestLogger).toBe('function');
  });

  it('exports metricsHandler middleware', () => {
    expect(logsLib.metricsHandler).toBeDefined();
    expect(typeof logsLib.metricsHandler).toBe('function');
  });

  it('exports incrementBusinessEvent helper', () => {
    expect(logsLib.incrementBusinessEvent).toBeDefined();
    expect(typeof logsLib.incrementBusinessEvent).toBe('function');
  });

  it('exports incrementHttp helper', () => {
    expect(logsLib.incrementHttp).toBeDefined();
    expect(typeof logsLib.incrementHttp).toBe('function');
  });

  it('exports observeHttpDuration helper', () => {
    expect(logsLib.observeHttpDuration).toBeDefined();
    expect(typeof logsLib.observeHttpDuration).toBe('function');
  });

  it('exports runWithContext function', () => {
    expect(logsLib.runWithContext).toBeDefined();
    expect(typeof logsLib.runWithContext).toBe('function');
  });

  it('exports getCurrentCorrelationId function', () => {
    expect(logsLib.getCurrentCorrelationId).toBeDefined();
    expect(typeof logsLib.getCurrentCorrelationId).toBe('function');
  });

  it('exports generateCorrelationId function', () => {
    expect(logsLib.generateCorrelationId).toBeDefined();
    expect(typeof logsLib.generateCorrelationId).toBe('function');
  });

  it('exports register (Prometheus registry)', () => {
    expect(logsLib.register).toBeDefined();
    expect(typeof logsLib.register).toBe('object');
    expect(logsLib.register).toBe(originalRegister);
    expect(logsLib.register.metrics).toBeDefined();
    expect(typeof logsLib.register.metrics).toBe('function');
  });

  it('logger should implement all methods defined in ILogger', () => {
    const logger = logsLib.logger;
    for (const method of EXPECTED_LOGGER_METHODS) {
      expect(logger[method]).toBeDefined();
      expect(typeof logger[method]).toBe('function');
    }
  });

  it('exports wrapJobData helper', () => {
    expect(logsLib.wrapJobData).toBeDefined();
    expect(typeof logsLib.wrapJobData).toBe('function');
  });

  it('exports createWrapProcessor factory function', () => {
    expect(logsLib.createWrapProcessor).toBeDefined();
    expect(typeof logsLib.createWrapProcessor).toBe('function');
  });

  it('exports setQueueSize helper', () => {
    expect(logsLib.setQueueSize).toBeDefined();
    expect(typeof logsLib.setQueueSize).toBe('function');
  });

  it('exports startQueueMetricsUpdater function', () => {
    expect(logsLib.startQueueMetricsUpdater).toBeDefined();
    expect(typeof logsLib.startQueueMetricsUpdater).toBe('function');
  });
});
