export interface LoggerConfig {
  serviceName: string;
  instanceId: string;
  logLevel: string;
  nodeEnv: string;
  logDirectory: string;
  logMaxSize: string;
  logMaxFiles: string;
  fileLogLevel?: string;
}

export function getServiceName(): string {
  return process.env.SERVICE_NAME ?? 'unknown-service';
}

export function getLoggerConfig(): LoggerConfig {
  return {
    serviceName: getServiceName(),
    instanceId: process.env.NODE_APP_INSTANCE ?? '0',
    logLevel: process.env.LOG_LEVEL ?? 'info',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    logDirectory: process.env.LOG_DIR ?? '/var/log/move',
    logMaxSize: process.env.LOG_MAX_SIZE || '100m',
    logMaxFiles: process.env.LOG_MAX_FILES || '7d',
    fileLogLevel: process.env.FILE_LOG_LEVEL || process.env.LOG_LEVEL || 'debug',
  };
}
