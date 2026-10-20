module.exports = {
  apps: [
    {
      name: 'tracking-http',
      script: 'dist/index.js',
      exec_mode: 'cluster',
      instances: 2,
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 4004,
        SERVICE_NAME: 'tracking-http',
      },
      env_production: {
        NODE_ENV: 'production',
        SERVICE_NAME: 'tracking-http',
      },
    },
    {
      name: 'tracking-gps-worker',
      script: 'dist/gps-ingest-worker.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      kill_timeout: 8000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        SERVICE_NAME: 'tracking-gps-worker',
      },
      env_production: {
        NODE_ENV: 'production',
        SERVICE_NAME: 'tracking-gps-worker',
      },
    },
    {
      name: 'tracking-alert-worker',
      script: 'dist/alert-detection-worker.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      kill_timeout: 8000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        SERVICE_NAME: 'tracking-alert-worker',
      },
      env_production: {
        NODE_ENV: 'production',
        SERVICE_NAME: 'tracking-alert-worker',
      },
    },
    {
      name: 'tracking-notification-worker',
      script: 'dist/notification-worker.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      kill_timeout: 8000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        SERVICE_NAME: 'tracking-notification-worker',
      },
      env_production: {
        NODE_ENV: 'production',
        SERVICE_NAME: 'tracking-notification-worker',
      },
    },
  ],
};
