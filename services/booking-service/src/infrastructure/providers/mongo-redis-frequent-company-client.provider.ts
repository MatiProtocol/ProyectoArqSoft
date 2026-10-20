import { redisClient } from '@move/auth-lib/dist/infrastructure/redis/client';
import { logger } from '@move/logs-lib';
import type { FrequentCompanyClientProvider } from '../../application/contracts/frequent-company-client.provider';
import { BookingCustomerType } from '../../domain/enums/booking-customer-type';
import { BookingModel } from '../models/booking.model';

const CACHE_KEY = 'booking-service:frequent-company-clients:top20';
const CACHE_TTL_SECONDS = 14400;
const TOP_COMPANY_CLIENT_LIMIT = 20;
const FREQUENT_CLIENT_WINDOW_DAYS = 7;

type RedisTopCompanyClient = {
  get(key: string): Promise<string | null>;
  setEx(key: string, seconds: number, value: string): Promise<unknown>;
};

type FrequentCompanyClientAggregationResult = {
  _id: string;
  count: number;
};

export class MongoRedisFrequentCompanyClientProvider implements FrequentCompanyClientProvider {
  constructor(
    private readonly redis: RedisTopCompanyClient = redisClient as RedisTopCompanyClient
  ) {}

  async isFrequentCompanyClient(companyUserId: string): Promise<boolean> {
    try {
      const topCompanyUserIds = await this.getTopCompanyUserIds();

      return topCompanyUserIds.includes(companyUserId);
    } catch (error) {
      logger.warn('Frequent company client ranking could not be resolved', {
        companyUserId,
        error: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  private async getTopCompanyUserIds(): Promise<string[]> {
    const cachedTopCompanyUserIds = await this.getCachedTopCompanyUserIds();

    if (cachedTopCompanyUserIds) return cachedTopCompanyUserIds;

    const topCompanyUserIds = await this.calculateTopCompanyUserIds();

    await this.cacheTopCompanyUserIds(topCompanyUserIds);

    return topCompanyUserIds;
  }

  private async getCachedTopCompanyUserIds(): Promise<string[] | undefined> {
    try {
      const cached = await this.redis.get(CACHE_KEY);

      if (!cached) return undefined;

      const parsed = JSON.parse(cached);

      if (!Array.isArray(parsed) || !parsed.every((userId) => typeof userId === 'string')) {
        return undefined;
      }

      return parsed;
    } catch (error) {
      logger.warn('Frequent company client cache read failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      return undefined;
    }
  }

  private async calculateTopCompanyUserIds(): Promise<string[]> {
    const createdFrom = new Date();
    createdFrom.setDate(createdFrom.getDate() - FREQUENT_CLIENT_WINDOW_DAYS);

    const topCompanyClients = await BookingModel.aggregate<FrequentCompanyClientAggregationResult>([
      {
        $match: {
          customerType: BookingCustomerType.COMPANY,
          createdAt: { $gte: createdFrom },
        },
      },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: TOP_COMPANY_CLIENT_LIMIT },
    ]);

    return topCompanyClients.map((client) => client._id);
  }

  private async cacheTopCompanyUserIds(topCompanyUserIds: string[]): Promise<void> {
    try {
      await this.redis.setEx(CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify(topCompanyUserIds));
    } catch (error) {
      logger.warn('Frequent company client cache write failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
