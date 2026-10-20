module.exports = {
  apps: [
    {
      name: 'identity-service',
      script: 'dist/index.js',
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: '300M',
      wait_ready: true,
      listen_timeout: 8000,
      instances: 2,
      env: {
        NODE_ENV: 'development',
        PORT: 4001,
        SERVICE_NAME: 'identity-service',
      },
      env_production: {
        NODE_ENV: 'production',
        SERVICE_NAME: 'identity-service',
      },
    },
  ],
};
