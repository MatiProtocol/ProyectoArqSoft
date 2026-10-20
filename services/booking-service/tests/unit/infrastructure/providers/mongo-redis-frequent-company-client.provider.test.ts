jest.mock('@move/logs-lib', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

jest.mock('@move/auth-lib/dist/infrastructure/redis/client', () => ({
  redisClient: {
    get: jest.fn(),
    setEx: jest.fn(),
  },
}));

var mockAggregate: jest.Mock;

jest.mock('../../../../src/infrastructure/models/booking.model', () => {
  mockAggregate = jest.fn();

  return {
    BookingModel: {
      aggregate: mockAggregate,
    },
  };
});

import { BookingCustomerType } from '../../../../src/domain/enums/booking-customer-type';
import { MongoRedisFrequentCompanyClientProvider } from '../../../../src/infrastructure/providers/mongo-redis-frequent-company-client.provider';

describe('MongoRedisFrequentCompanyClientProvider', () => {
  let redis: {
    get: jest.Mock;
    setEx: jest.Mock;
  };
  let provider: MongoRedisFrequentCompanyClientProvider;

  beforeEach(() => {
    redis = {
      get: jest.fn(),
      setEx: jest.fn(),
    };
    provider = new MongoRedisFrequentCompanyClientProvider(redis);
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should resolve frequent company clients from Redis cache', async () => {
    redis.get.mockResolvedValueOnce(JSON.stringify(['company_1', 'company_2']));

    const result = await provider.isFrequentCompanyClient('company_2');

    expect(result).toBe(true);
    expect(redis.get).toHaveBeenCalledWith('booking-service:frequent-company-clients:top20');
    expect(mockAggregate).not.toHaveBeenCalled();
    expect(redis.setEx).not.toHaveBeenCalled();
  });

  it('should calculate top 20 company clients for the last 7 days on cache miss', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-25T12:00:00.000Z'));
    redis.get.mockResolvedValueOnce(null);
    mockAggregate.mockResolvedValueOnce([{ _id: 'company_1', count: 4 }]);

    const result = await provider.isFrequentCompanyClient('company_1');

    expect(result).toBe(true);
    expect(mockAggregate).toHaveBeenCalledWith([
      {
        $match: {
          customerType: BookingCustomerType.COMPANY,
          createdAt: { $gte: new Date('2026-06-18T12:00:00.000Z') },
        },
      },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 20 },
    ]);
    expect(redis.setEx).toHaveBeenCalledWith(
      'booking-service:frequent-company-clients:top20',
      14400,
      JSON.stringify(['company_1'])
    );
  });

  it('should use MongoDB when Redis cache read fails', async () => {
    redis.get.mockRejectedValueOnce(new Error('Redis unavailable'));
    mockAggregate.mockResolvedValueOnce([{ _id: 'company_1', count: 4 }]);

    const result = await provider.isFrequentCompanyClient('company_1');

    expect(result).toBe(true);
    expect(mockAggregate).toHaveBeenCalledTimes(1);
  });

  it('should return false when ranking calculation fails', async () => {
    redis.get.mockResolvedValueOnce(null);
    mockAggregate.mockRejectedValueOnce(new Error('Mongo unavailable'));

    const result = await provider.isFrequentCompanyClient('company_1');

    expect(result).toBe(false);
  });
});
