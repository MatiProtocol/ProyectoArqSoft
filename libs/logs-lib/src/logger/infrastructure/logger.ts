import winston from 'winston';
import type { LoggerConfig } from '../../config/env';
import { levels } from '../domain/levels';

export function createLogger(config: LoggerConfig, transports: winston.transport[]) {
  return winston.createLogger({
    levels,
    level: config.logLevel,

    defaultMeta: {
      service: config.serviceName,
      instance: config.instanceId,
      pid: process.pid,
    },

    transports,

    exitOnError: false,
  });
}
