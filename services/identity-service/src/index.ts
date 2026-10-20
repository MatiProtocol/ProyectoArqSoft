import { redisClient } from '@move/auth-lib';
import mongoose from 'mongoose';
import { app, setupRoutes } from './app';
import { connectMongo } from './infrastructure/config/database';
import { seedAdminUser } from './infrastructure/seeders/admin.seeder';

export async function startServer() {
  const port = Number(process.env.PORT) || 4001;

  try {
    if (process.env.NODE_ENV !== 'test') {
      await connectMongo();

      const db = mongoose.connection.db;
      if (db) {
        setupRoutes(db);
      }

      await seedAdminUser();

      redisClient.on('error', (err: Error) => {
        console.error('Redis client error:', err);
      });

      await redisClient.connect();
    }

    app.listen(port, () => console.log(`identity-service listening on ${port}`));
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
