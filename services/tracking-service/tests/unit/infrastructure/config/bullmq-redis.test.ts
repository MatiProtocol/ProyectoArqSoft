import { getBullMqRedisConnection } from '../../../../src/infrastructure/config/bullmq-redis';

describe('getBullMqRedisConnection', () => {
  it('should use process.env by default', () => {
    const previous = process.env.REDIS_URL;
    process.env.REDIS_URL = 'redis://localhost:6379';

    const connection = getBullMqRedisConnection();

    expect(connection).toEqual(expect.objectContaining({ host: 'localhost', port: 6379 }));

    process.env.REDIS_URL = previous;
  });

  it('should parse REDIS_URL using redis protocol', () => {
    const connection = getBullMqRedisConnection({
      REDIS_URL: 'redis://user:pass@localhost:6380/2',
    });

    expect(connection).toEqual({
      host: 'localhost',
      port: 6380,
      username: 'user',
      password: 'pass',
    });
  });

  it('should use port 6379 by default', () => {
    const connection = getBullMqRedisConnection({
      REDIS_URL: 'redis://redis.example.com',
    });

    expect(connection).toEqual({
      host: 'redis.example.com',
      port: 6379,
      username: '',
      password: '',
    });
  });

  it.each([undefined, '', '   '])('should throw when REDIS_URL is %s', (redisUrl) => {
    expect(() =>
      getBullMqRedisConnection({
        REDIS_URL: redisUrl,
      })
    ).toThrow('REDIS_URL environment variable is required');
  });

  it('should throw when REDIS_URL is not a valid URL', () => {
    expect(() =>
      getBullMqRedisConnection({
        REDIS_URL: 'not-a-url',
      })
    ).toThrow();
  });
});
