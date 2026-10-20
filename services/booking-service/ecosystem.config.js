module.exports = {
  apps: [
    {
      name: 'booking-http',
      script: 'dist/index.js',
      exec_mode: 'cluster',
      instances: 2,
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 4002,
        SERVICE_NAME: 'booking-http',
      },
      env_production: {
        NODE_ENV: 'production',
        SERVICE_NAME: 'booking-http',
      },
    },
    {
      name: 'booking-operator-worker',
      script: 'dist/operator-notification-worker.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      kill_timeout: 8000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        SERVICE_NAME: 'booking-operator-worker',
      },
      env_production: {
        NODE_ENV: 'production',
        SERVICE_NAME: 'booking-operator-worker',
      },
    },
    {
      name: 'booking-customer-email-worker',
      script: 'dist/customer-email-worker.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      kill_timeout: 8000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        SERVICE_NAME: 'booking-customer-email-worker',
      },
      env_production: {
        NODE_ENV: 'production',
        SERVICE_NAME: 'booking-customer-email-worker',
      },
    },
    {
      name: 'booking-payment-retry-worker',
      script: 'dist/payment-retry-worker.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      kill_timeout: 8000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        SERVICE_NAME: 'booking-payment-retry-worker',
      },
      env_production: {
        NODE_ENV: 'production',
        SERVICE_NAME: 'booking-payment-retry-worker',
      },
    },
    {
      name: 'booking-transfer-assigned-worker',
      script: 'dist/transfer-assigned-worker.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      kill_timeout: 8000,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        SERVICE_NAME: 'booking-transfer-assigned-worker',
      },
      env_production: {
        NODE_ENV: 'production',
        SERVICE_NAME: 'booking-transfer-assigned-worker',
      },
    },
  ],
};
