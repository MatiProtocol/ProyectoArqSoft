import mongoose from 'mongoose';
import { env } from './env';

export async function connectMongo(): Promise<void> {
  if (!env.MONGO_URL) throw new Error('MONGO_URL not defined');
  await mongoose.connect(env.MONGO_URL, { serverSelectionTimeoutMS: 5000 });
}

export function pingMongo(): boolean {
  return mongoose.connection.readyState === 1;
}
