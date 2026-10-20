import { redisClient } from '@move/auth-lib/dist/infrastructure/redis/client';
import { logger } from '@move/logs-lib';
import mongoose from 'mongoose';
import { app, setupRoutes } from './app';
import { connectMongo } from './infrastructure/config/database';

export async function startServer() {
  const port = Number(process.env.PORT) || 4002;

  try {
    if (process.env.NODE_ENV !== 'test') {
      await connectMongo();
      logger.info('MongoDB connected');

      redisClient.on('error', (err) => {
        logger.error('Redis client error', {
          error: err instanceof Error ? err.message : String(err),
        });
      });

      await redisClient.connect();
      logger.info('Redis connected');

      const db = mongoose.connection.db;
      if (db) {
        setupRoutes(db as unknown as Parameters<typeof setupRoutes>[0]);
      }
    }

    app.listen(port, () => {
      logger.info('booking-service listening', { port });
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
