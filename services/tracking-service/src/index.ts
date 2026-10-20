import { redisClient } from '@move/auth-lib';
import { logger } from '@move/logs-lib';
import mongoose from 'mongoose';
import { app, setupRoutes } from './app';
import { connectMongo } from './infrastructure/config/database';

export async function startServer() {
  const port = Number(process.env.PORT) || 4004;

  try {
    if (process.env.NODE_ENV !== 'test') {
      await connectMongo();
      logger.info('MongoDB connected');

      const db = mongoose.connection.db;
      if (db) {
        setupRoutes(db as Parameters<typeof setupRoutes>[0]);
      }

      redisClient.on('error', (err) => {
        logger.error('Redis client error', {
          error: err instanceof Error ? err.message : String(err),
        });
      });

      await redisClient.connect();
      logger.info('Redis connected');
    }

    app.listen(port, () => {
      logger.info('tracking-service listening', { port });
    });
  } catch (err) {
    logger.error('Failed to start app', {
      error: err instanceof Error ? err.message : String(err),
    });
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
}

if (require.main === module) {
  void startServer();
}
