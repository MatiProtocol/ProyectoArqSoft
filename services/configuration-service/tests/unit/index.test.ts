const mockListen = jest.fn((_port: number, cb?: () => void) => {
  if (cb) cb();
  return undefined;
});
const mockSetupRoutes = jest.fn();
jest.mock('../../src/app', () => ({
  app: { listen: mockListen },
  setupRoutes: mockSetupRoutes,
}));

const mockConnectMongo = jest.fn();
jest.mock('../../src/infrastructure/config/database', () => ({
  connectMongo: mockConnectMongo,
}));

const mockSeedRules = jest.fn();
jest.mock('../../src/infrastructure/seed/seed-rules', () => ({
  seedRules: mockSeedRules,
}));

const mockRedisOn = jest.fn();
const mockRedisConnect = jest.fn();
jest.mock('@move/auth-lib', () => ({
  redisClient: { on: mockRedisOn, connect: mockRedisConnect },
}));

const mockMongoose = { connection: { db: {} as unknown } };
jest.mock('mongoose', () => mockMongoose);

import { startServer } from '../../src/index';

describe('startServer', () => {
  const originalEnv = process.env.NODE_ENV;
  let exitSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectMongo.mockResolvedValue(undefined);
    mockSeedRules.mockResolvedValue(undefined);
    mockRedisConnect.mockResolvedValue(undefined);
    mockMongoose.connection.db = {};
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    exitSpy.mockRestore();
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('in test env should only start listening, skipping mongo/redis', async () => {
    process.env.NODE_ENV = 'test';

    await startServer();

    expect(mockConnectMongo).not.toHaveBeenCalled();
    expect(mockSeedRules).not.toHaveBeenCalled();
    expect(mockRedisConnect).not.toHaveBeenCalled();
    expect(mockListen).toHaveBeenCalledTimes(1);
  });

  it('in non-test env should connect mongo, seed rules, setup routes, connect redis and listen', async () => {
    process.env.NODE_ENV = 'development';
    mockMongoose.connection.db = { name: 'move' };

    await startServer();

    expect(mockConnectMongo).toHaveBeenCalledTimes(1);
    expect(mockSeedRules).toHaveBeenCalledTimes(1);
    expect(mockSetupRoutes).toHaveBeenCalledWith({ name: 'move' });
    expect(mockRedisOn).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockRedisConnect).toHaveBeenCalledTimes(1);
    expect(mockListen).toHaveBeenCalledTimes(1);
  });

  it('should not setup routes when mongoose has no db handle', async () => {
    process.env.NODE_ENV = 'development';
    mockMongoose.connection.db = null;

    await startServer();

    expect(mockSetupRoutes).not.toHaveBeenCalled();
    expect(mockListen).toHaveBeenCalledTimes(1);
  });

  it('should log via the registered redis error handler', async () => {
    process.env.NODE_ENV = 'development';

    await startServer();
    const errorHandler = mockRedisOn.mock.calls[0][1] as (err: Error) => void;
    errorHandler(new Error('redis down'));

    expect(errorSpy).toHaveBeenCalledWith('Redis client error:', expect.any(Error));
  });

  it('in non-test env should call process.exit(1) when startup fails', async () => {
    process.env.NODE_ENV = 'development';
    mockConnectMongo.mockRejectedValueOnce(new Error('mongo down'));

    await startServer();

    expect(errorSpy).toHaveBeenCalledWith('Failed to start app', expect.any(Error));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('in test env should not call process.exit when startup fails', async () => {
    process.env.NODE_ENV = 'test';
    mockListen.mockImplementationOnce(() => {
      throw new Error('listen fail');
    });

    await startServer();

    expect(errorSpy).toHaveBeenCalledWith('Failed to start app', expect.any(Error));
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
