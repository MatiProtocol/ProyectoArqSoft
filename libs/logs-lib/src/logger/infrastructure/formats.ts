import winston from 'winston';
import { getCurrentCorrelationId } from '../context';

export const correlationFormat = winston.format((info) => {
  info.correlationId = getCurrentCorrelationId();

  return info;
});

export const defaultFormat = winston.format.combine(
  correlationFormat(),
  winston.format.timestamp(),
  winston.format.errors({
    stack: true,
  }),
  winston.format.json()
);
