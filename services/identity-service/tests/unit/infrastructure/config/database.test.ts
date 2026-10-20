import mongoose from 'mongoose';
import { connectMongo, pingMongo } from '../../../../src/infrastructure/config/database';
import { env } from '../../../../src/infrastructure/config/env';

jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    readyState: 0,
  },
}));

jest.mock('../../../../src/infrastructure/config/env', () => ({
  env: {
    MONGO_URL: 'mongodb://localhost:27017/test',
  },
}));

const mockedMongoose = mongoose as jest.Mocked<typeof mongoose>;
const mockedEnv = env as jest.Mocked<typeof env>;

describe('connectMongo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnv.MONGO_URL = 'mongodb://localhost:27017/test';
  });

  it('should connect successfully when MONGO_URL is defined', async () => {
    mockedMongoose.connect.mockResolvedValueOnce(undefined as never);

    await expect(connectMongo()).resolves.toBeUndefined();
    expect(mockedMongoose.connect).toHaveBeenCalledTimes(1);
    expect(mockedMongoose.connect).toHaveBeenCalledWith(env.MONGO_URL, {
      serverSelectionTimeoutMS: 5000,
    });
  });

  it('should throw an error if MONGO_URL is not defined', async () => {
    mockedEnv.MONGO_URL = undefined as unknown as string;

    await expect(connectMongo()).rejects.toThrow('MONGO_URL not defined');
    expect(mockedMongoose.connect).not.toHaveBeenCalled();
  });

  it('should propagate error if mongoose.connect fails', async () => {
    const error = new Error('Connection failed');
    mockedMongoose.connect.mockRejectedValueOnce(error);

    await expect(connectMongo()).rejects.toThrow('Connection failed');
    expect(mockedMongoose.connect).toHaveBeenCalledTimes(1);
  });
});

describe('pingMongo', () => {
  beforeEach(() => {
    (mockedMongoose.connection as { readyState: number }).readyState = 0;
  });

  it('should return true when readyState is 1', () => {
    (mockedMongoose.connection as { readyState: number }).readyState = 1;
    expect(pingMongo()).toBe(true);
  });

  it('should return false when readyState is not 1', () => {
    const invalidStates = [0, 2, 3, 99];
    invalidStates.forEach((state) => {
      (mockedMongoose.connection as { readyState: number }).readyState = state;
      expect(pingMongo()).toBe(false);
    });
  });
});
