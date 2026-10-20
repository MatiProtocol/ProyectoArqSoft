import { redisClient } from '@move/auth-lib';
import mongoose from 'mongoose';
import { app, setupRoutes } from './app';
import { connectMongo } from './infrastructure/config/database';
import { seedRules } from './infrastructure/seed/seed-rules';

export async function startServer() {
  const port = Number(process.env.PORT) || 4003;

  try {
    if (process.env.NODE_ENV !== 'test') {
      await connectMongo();
      await seedRules();

      const db = mongoose.connection.db;
      if (db) {
        setupRoutes(db);
      }

      redisClient.on('error', (err) => {
        console.error('Redis client error:', err);
      });

      await redisClient.connect();
    }

    app.listen(port, () => console.log(`configuration-service listening on ${port}`));
  } catch (err) {
    console.error('Failed to start app', err);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
}

if (require.main === module) {
  void startServer();
}
