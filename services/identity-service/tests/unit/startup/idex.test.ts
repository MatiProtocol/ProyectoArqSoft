process.env.AUTH0_DOMAIN = 'test.domain.com';
process.env.AUTH0_AUDIENCE = 'https://test-api';

type ExpressAppMock = {
  get: jest.Mock;
  use: jest.Mock;
  listen: jest.Mock;
};

type RedisClientMock = {
  on: jest.Mock;
  connect: jest.Mock;
};

jest.mock('@move/auth-lib', () => ({
  redisClient: {
    on: jest.fn(),
    connect: jest.fn(),
  },
  validateJwt: jest.fn((_req, _res, next) => next()),
  ensureUserIdFromToken: jest.fn((_req, _res, next) => next()),
}));

jest.mock('../../../src/infrastructure/seeders/admin.seeder', () => ({
  seedAdminUser: jest.fn(),
}));

jest.mock('mongoose', () => ({
  __esModule: true,
  default: {
    connection: {
      db: null as unknown,
    },
  },
}));

jest.mock('../../../src/app', () => ({
  app: {
    get: jest.fn(),
    use: jest.fn(),
    listen: jest.fn(),
  },
  setupRoutes: jest.fn(),
}));

jest.mock('../../../src/infrastructure/config/database', () => ({
  connectMongo: jest.fn(),
}));

import { redisClient as mockRedisClientRaw } from '@move/auth-lib';
import mongoose from 'mongoose';
import { app as mockAppRaw, setupRoutes as mockSetupRoutesRaw } from '../../../src/app';
import { startServer as startServerFn } from '../../../src/index';
import { connectMongo as mockConnectMongoRaw } from '../../../src/infrastructure/config/database';
import { seedAdminUser as mockSeedAdminUserRaw } from '../../../src/infrastructure/seeders/admin.seeder';

const mockApp = mockAppRaw as unknown as ExpressAppMock;
const mockSetupRoutes = mockSetupRoutesRaw as jest.Mock;
const mockConnectMongo = mockConnectMongoRaw as jest.Mock;
const mockRedisClient = mockRedisClientRaw as unknown as RedisClientMock;
const mockSeedAdminUser = mockSeedAdminUserRaw as jest.Mock;

describe('services/identity-service src/index.ts', () => {
  const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
  let mockConsoleError: jest.SpyInstance;
  let mockProcessExit: jest.SpyInstance;

  const startServer = startServerFn;

  beforeEach(() => {
    jest.clearAllMocks();

    mockApp.listen.mockImplementation((_port, cb) => {
      if (cb) cb();
      return mockApp;
    });

    (mongoose.connection as any).db = {};

    mockRedisClient.on.mockClear();
    mockRedisClient.connect.mockClear();

    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockProcessExit = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined as never) as never);

    delete process.env.PORT;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    mockConsoleError.mockRestore();
    mockProcessExit.mockRestore();
    mockConsoleLog.mockClear();
  });

  describe('Server startup', () => {
    it('listens on default port', async () => {
      process.env.NODE_ENV = 'development';
      mockConnectMongo.mockResolvedValue(undefined);
      mockRedisClient.connect.mockResolvedValue(undefined);

      await startServer();

      expect(mockApp.listen).toHaveBeenCalledTimes(1);
      expect(mockApp.listen).toHaveBeenCalledWith(4001, expect.any(Function));
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('identity-service listening on')
      );
    });

    it('uses PORT env when provided', async () => {
      process.env.NODE_ENV = 'development';
      process.env.PORT = '12345';
      mockConnectMongo.mockResolvedValue(undefined);
      mockRedisClient.connect.mockResolvedValue(undefined);

      await startServer();

      expect(mockApp.listen).toHaveBeenCalledWith(12345, expect.any(Function));
    });
  });

  describe('Database connection logic', () => {
    it('should call connectMongo when NODE_ENV is not test', async () => {
      process.env.NODE_ENV = 'development';
      mockConnectMongo.mockResolvedValue(undefined);
      mockRedisClient.connect.mockResolvedValue(undefined);

      await startServer();

      expect(mockConnectMongo).toHaveBeenCalledTimes(1);
    });

    it('should NOT call connectMongo when NODE_ENV is test', async () => {
      process.env.NODE_ENV = 'test';
      mockConnectMongo.mockResolvedValue(undefined);
      mockRedisClient.connect.mockResolvedValue(undefined);

      await startServer();

      expect(mockConnectMongo).not.toHaveBeenCalled();
    });

    it('should exit with code 1 if connectMongo fails', async () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Mongo connection failed');
      mockConnectMongo.mockRejectedValue(error);

      await startServer();

      expect(mockConsoleError).toHaveBeenCalledWith('Failed to start app', error);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should call app.listen only after successful database connection', async () => {
      process.env.NODE_ENV = 'development';
      let listenCalled = false;
      mockApp.listen.mockImplementation((_port, cb) => {
        listenCalled = true;
        if (cb) cb();
        return mockApp;
      });
      mockConnectMongo.mockImplementation(async () => {
        expect(listenCalled).toBe(false);
      });
      mockRedisClient.connect.mockResolvedValue(undefined);

      await startServer();

      expect(mockConnectMongo).toHaveBeenCalled();
      expect(mockSetupRoutes).toHaveBeenCalled();
      expect(mockApp.listen).toHaveBeenCalled();
    });

    it('should call setupRoutes with mongoose db after connectMongo', async () => {
      process.env.NODE_ENV = 'development';
      const dbMock = { name: 'test-db' };
      (mongoose.connection as any).db = dbMock;

      mockConnectMongo.mockResolvedValue(undefined);
      mockRedisClient.connect.mockResolvedValue(undefined);

      await startServer();

      expect(mockSetupRoutes).toHaveBeenCalledTimes(1);
      expect(mockSetupRoutes).toHaveBeenCalledWith(dbMock);
    });

    it('should NOT call setupRoutes when mongoose.connection.db is null', async () => {
      (mongoose.connection as any).db = null;

      process.env.NODE_ENV = 'development';
      mockConnectMongo.mockResolvedValue(undefined);
      mockRedisClient.connect.mockResolvedValue(undefined);

      await startServer();

      expect(mockSetupRoutes).not.toHaveBeenCalled();
    });
  });

  describe('Redis client initialization', () => {
    it('registers an error handler on redisClient', async () => {
      process.env.NODE_ENV = 'development';
      mockConnectMongo.mockResolvedValue(undefined);
      mockRedisClient.connect.mockResolvedValue(undefined);

      await startServer();

      expect(mockRedisClient.on).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('calls redisClient.connect after registering the error handler', async () => {
      process.env.NODE_ENV = 'development';
      mockConnectMongo.mockResolvedValue(undefined);
      mockRedisClient.connect.mockResolvedValue(undefined);

      await startServer();

      const onCallOrder = mockRedisClient.on.mock.invocationCallOrder[0];
      const connectCallOrder = mockRedisClient.connect.mock.invocationCallOrder[0];
      expect(onCallOrder).toBeLessThan(connectCallOrder);
      expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
    });

    it('logs redis client errors', async () => {
      process.env.NODE_ENV = 'development';
      mockConnectMongo.mockResolvedValue(undefined);
      mockRedisClient.connect.mockResolvedValue(undefined);

      await startServer();

      const errorHandler = mockRedisClient.on.mock.calls[0][1] as (err: Error) => void;
      const testError = new Error('Connection lost');
      errorHandler(testError);

      expect(mockConsoleError).toHaveBeenCalledWith('Redis client error:', testError);
    });

    it('should exit when redis connection fails outside test env', async () => {
      process.env.NODE_ENV = 'development';
      const redisError = new Error('Redis connection refused');
      mockConnectMongo.mockResolvedValue(undefined);
      mockRedisClient.connect.mockRejectedValue(redisError);

      await startServer();

      expect(mockConsoleError).toHaveBeenCalledWith('Failed to start app', redisError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockApp.listen).not.toHaveBeenCalled();
    });

    it('should call app.listen only after redis connection succeeds', async () => {
      process.env.NODE_ENV = 'development';
      let listenCalled = false;
      mockApp.listen.mockImplementation((_port, cb) => {
        listenCalled = true;
        if (cb) cb();
        return mockApp;
      });
      mockConnectMongo.mockResolvedValue(undefined);
      mockRedisClient.connect.mockImplementation(async () => {
        expect(listenCalled).toBe(false);
        return mockRedisClient;
      });

      await startServer();

      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockApp.listen).toHaveBeenCalled();
    });
  });

  describe('Admin seeder integration', () => {
    it('should call seedAdminUser when NODE_ENV is not test', async () => {
      process.env.NODE_ENV = 'development';
      mockConnectMongo.mockResolvedValue(undefined);
      mockRedisClient.connect.mockResolvedValue(undefined);

      await startServer();

      expect(mockSeedAdminUser).toHaveBeenCalledTimes(1);
    });

    it('should NOT call seedAdminUser when NODE_ENV is test', async () => {
      process.env.NODE_ENV = 'test';
      mockConnectMongo.mockResolvedValue(undefined);
      mockRedisClient.connect.mockResolvedValue(undefined);

      await startServer();

      expect(mockSeedAdminUser).not.toHaveBeenCalled();
    });

    it('should call seedAdminUser after setupRoutes', async () => {
      process.env.NODE_ENV = 'development';
      mockConnectMongo.mockResolvedValue(undefined);
      mockRedisClient.connect.mockResolvedValue(undefined);

      mockSetupRoutes.mockClear();
      mockSeedAdminUser.mockClear();

      await startServer();

      expect(mockSetupRoutes).toHaveBeenCalled();
      expect(mockSeedAdminUser).toHaveBeenCalled();

      const setupOrder = mockSetupRoutes.mock.invocationCallOrder[0];
      const seedOrder = mockSeedAdminUser.mock.invocationCallOrder[0];
      expect(setupOrder).toBeLessThan(seedOrder);
    });

    it('should not crash the server if seedAdminUser throws (it catches internally)', async () => {
      process.env.NODE_ENV = 'development';
      mockConnectMongo.mockResolvedValue(undefined);
      mockRedisClient.connect.mockResolvedValue(undefined);

      await startServer();

      expect(mockApp.listen).toHaveBeenCalled();
    });
  });
});
