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

  it('connects when MONGO_URL is defined', async () => {
    mockedMongoose.connect.mockResolvedValueOnce(undefined as never);

    await expect(connectMongo()).resolves.toBeUndefined();

    expect(mockedMongoose.connect).toHaveBeenCalledWith(env.MONGO_URL, {
      serverSelectionTimeoutMS: 5000,
    });
  });

  it('throws when MONGO_URL is not defined', async () => {
    mockedEnv.MONGO_URL = undefined as unknown as string;

    await expect(connectMongo()).rejects.toThrow('MONGO_URL not defined');
    expect(mockedMongoose.connect).not.toHaveBeenCalled();
  });
});

describe('pingMongo', () => {
  it('returns true when mongoose is connected', () => {
    (mockedMongoose.connection as { readyState: number }).readyState = 1;

    expect(pingMongo()).toBe(true);
  });

  it('returns false when mongoose is not connected', () => {
    (mockedMongoose.connection as { readyState: number }).readyState = 0;

    expect(pingMongo()).toBe(false);
  });
});
