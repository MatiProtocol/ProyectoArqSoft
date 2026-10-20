process.env.AUTH0_DOMAIN = 'test.domain.com';
process.env.AUTH0_AUDIENCE = 'https://test-api';

type ExpressMock = {
  listen: jest.Mock;
};

let mockApp: ExpressMock;
let mockDb: object;
let mockConnectMongo: jest.Mock;
let mockProcessExit: jest.SpyInstance;
let mockRedisClient: { on: jest.Mock; connect: jest.Mock };
let mockSetupRoutes: jest.Mock;
let mockLogger: {
  info: jest.Mock;
  error: jest.Mock;
};

jest.mock('@move/auth-lib', () => ({
  redisClient: {
    on: jest.fn(),
    connect: jest.fn(),
  },
}));

describe('tracking-service index.ts', () => {
  let startServer: () => Promise<void>;

  beforeEach(() => {
    jest.resetModules();

    mockApp = {
      listen: jest.fn((_port: number, cb?: () => void) => {
        if (cb) cb();
        return mockApp;
      }),
    };
    mockConnectMongo = jest.fn();
    mockSetupRoutes = jest.fn();
    mockDb = {};
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    jest.doMock('../../../src/infrastructure/config/database', () => ({
      connectMongo: mockConnectMongo,
    }));
    jest.doMock('../../../src/app', () => ({
      app: mockApp,
      setupRoutes: mockSetupRoutes,
    }));
    jest.doMock('mongoose', () => ({
      __esModule: true,
      default: {
        connection: {
          db: mockDb,
        },
      },
    }));
    jest.doMock('@move/logs-lib', () => ({
      logger: mockLogger,
    }));

    mockProcessExit = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined as never) as never);

    const authLib = require('@move/auth-lib');
    mockRedisClient = authLib.redisClient;
    mockRedisClient.on.mockClear();
    mockRedisClient.connect.mockClear();

    delete process.env.PORT;
    process.env.NODE_ENV = 'test';

    ({ startServer } = require('../../../src/index') as { startServer: () => Promise<void> });
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    mockProcessExit.mockRestore();
  });

  it('listens on default tracking-service port', async () => {
    process.env.NODE_ENV = 'development';
    mockConnectMongo.mockResolvedValue(undefined);
    mockRedisClient.connect.mockResolvedValue(undefined);

    await startServer();

    expect(mockApp.listen).toHaveBeenCalledWith(4004, expect.any(Function));
    expect(mockLogger.info).toHaveBeenCalledWith('tracking-service listening', { port: 4004 });
  });

  it('uses PORT env when provided', async () => {
    process.env.NODE_ENV = 'development';
    process.env.PORT = '12345';
    mockConnectMongo.mockResolvedValue(undefined);
    mockRedisClient.connect.mockResolvedValue(undefined);

    await startServer();

    expect(mockApp.listen).toHaveBeenCalledWith(12345, expect.any(Function));
  });

  it('does not connect Mongo when NODE_ENV is test', async () => {
    process.env.NODE_ENV = 'test';

    await startServer();

    expect(mockConnectMongo).not.toHaveBeenCalled();
  });

  it('sets up routes with mongoose db after connecting Mongo', async () => {
    process.env.NODE_ENV = 'development';
    mockConnectMongo.mockResolvedValue(undefined);
    mockRedisClient.connect.mockResolvedValue(undefined);

    await startServer();

    expect(mockConnectMongo).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith('MongoDB connected');
    expect(mockSetupRoutes).toHaveBeenCalledWith(mockDb);
  });

  it('does not set up routes when mongoose db is unavailable', async () => {
    process.env.NODE_ENV = 'development';
    mockConnectMongo.mockResolvedValue(undefined);
    mockRedisClient.connect.mockResolvedValue(undefined);
    jest.doMock('mongoose', () => ({
      __esModule: true,
      default: {
        connection: {
          db: undefined,
        },
      },
    }));
    jest.resetModules();
    jest.doMock('../../../src/infrastructure/config/database', () => ({
      connectMongo: mockConnectMongo,
    }));
    jest.doMock('../../../src/app', () => ({
      app: mockApp,
      setupRoutes: mockSetupRoutes,
    }));
    jest.doMock('@move/logs-lib', () => ({
      logger: mockLogger,
    }));
    jest.doMock('@move/auth-lib', () => ({
      redisClient: mockRedisClient,
    }));
    ({ startServer } = require('../../../src/index') as { startServer: () => Promise<void> });

    await startServer();

    expect(mockSetupRoutes).not.toHaveBeenCalled();
  });

  it('connects Redis after registering the error handler', async () => {
    process.env.NODE_ENV = 'development';
    mockConnectMongo.mockResolvedValue(undefined);
    mockRedisClient.connect.mockResolvedValue(undefined);

    await startServer();

    expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith('Redis connected');
  });

  it('logs an error when the Redis client emits one', async () => {
    process.env.NODE_ENV = 'development';
    mockConnectMongo.mockResolvedValue(undefined);
    mockRedisClient.connect.mockResolvedValue(undefined);

    await startServer();

    const errorListener = mockRedisClient.on.mock.calls.find(([event]) => event === 'error')[1];
    errorListener(new Error('Redis broke'));

    expect(mockLogger.error).toHaveBeenCalledWith('Redis client error', { error: 'Redis broke' });
  });

  it('exits when startup fails outside test env', async () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Mongo failed');
    mockConnectMongo.mockRejectedValue(error);

    await startServer();

    expect(mockLogger.error).toHaveBeenCalledWith('Failed to start app', {
      error: 'Mongo failed',
    });
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  it('does not exit when startup fails in test env', async () => {
    process.env.NODE_ENV = 'test';
    mockRedisClient.connect.mockRejectedValue(new Error('boom'));
    mockApp.listen.mockImplementation(() => {
      throw 'non-error thrown value';
    });

    await startServer();

    expect(mockLogger.error).toHaveBeenCalledWith('Failed to start app', {
      error: 'non-error thrown value',
    });
    expect(mockProcessExit).not.toHaveBeenCalled();
  });
});
