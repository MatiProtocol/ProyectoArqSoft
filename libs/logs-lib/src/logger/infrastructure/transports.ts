import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import type { LoggerConfig } from '../../config/env';

export function createTransports(config: LoggerConfig) {
  const transports: winston.transport[] = [];

  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      level: config.logLevel,
    })
  );

  if (config.nodeEnv !== 'test') {
    fs.mkdirSync(config.logDirectory, {
      recursive: true,
    });

    transports.push(
      new DailyRotateFile({
        filename: path.join(config.logDirectory, `${config.serviceName}-%DATE%.log`),
        datePattern: 'YYYY-MM-DD',
        maxSize: config.logMaxSize,
        maxFiles: config.logMaxFiles,
        level: config.fileLogLevel || config.logLevel,
      })
    );
  }

  return transports;
}
