import type { ConnectionOptions } from 'bullmq';

export function getBullMqRedisConnection(env: NodeJS.ProcessEnv = process.env): ConnectionOptions {
  const redisUrl = env.REDIS_URL?.trim();

  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required');
  }

  const parsedRedisUrl = new URL(redisUrl);

  return {
    host: parsedRedisUrl.hostname,
    port: Number(parsedRedisUrl.port || 6379),
    username: parsedRedisUrl.username,
    password: parsedRedisUrl.password,
  };
}
