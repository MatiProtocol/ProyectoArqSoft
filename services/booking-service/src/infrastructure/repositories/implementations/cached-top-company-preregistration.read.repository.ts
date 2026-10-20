import { redisClient } from '@move/auth-lib/dist/infrastructure/redis/client';
import { logger } from '@move/logs-lib';
import type { ICompanyPreregistrationReadRepository } from '../../../application/contracts/company-preregistration.read.repository';
import type { CompanyPreregistrationReadDto } from '../../../application/dtos/company-preregistration-read.dto';

const CACHE_KEY_PREFIX = 'booking-service:top-company-preregistration';
const CACHE_TTL_SECONDS = 300;

type RedisCompanyPreregistrationCache = {
  get(key: string): Promise<string | null>;
  setEx(key: string, seconds: number, value: string): Promise<unknown>;
};

export class CachedTopCompanyPreregistrationReadRepository
  implements ICompanyPreregistrationReadRepository
{
  constructor(
    private readonly sourceRepository: ICompanyPreregistrationReadRepository,
    private readonly redis: RedisCompanyPreregistrationCache = redisClient as RedisCompanyPreregistrationCache
  ) {}

  async getByCompanyUserId(
    companyUserId: string
  ): Promise<CompanyPreregistrationReadDto | undefined> {
    const cachedPreregistration = await this.getCachedPreregistration(companyUserId);

    if (cachedPreregistration) return cachedPreregistration;

    const preregistration = await this.sourceRepository.getByCompanyUserId(companyUserId);

    if (preregistration) {
      await this.cachePreregistration(companyUserId, preregistration);
    }

    return preregistration;
  }

  private async getCachedPreregistration(
    companyUserId: string
  ): Promise<CompanyPreregistrationReadDto | undefined> {
    try {
      const cached = await this.redis.get(this.cacheKey(companyUserId));

      if (!cached) return undefined;

      const parsed = JSON.parse(cached);

      if (!this.isCompanyPreregistrationReadDto(parsed)) return undefined;

      return parsed;
    } catch (error) {
      logger.warn('Top company preregistration cache read failed', {
        companyUserId,
        error: error instanceof Error ? error.message : String(error),
      });

      return undefined;
    }
  }

  private async cachePreregistration(
    companyUserId: string,
    preregistration: CompanyPreregistrationReadDto
  ): Promise<void> {
    try {
      await this.redis.setEx(
        this.cacheKey(companyUserId),
        CACHE_TTL_SECONDS,
        JSON.stringify(preregistration)
      );
    } catch (error) {
      logger.warn('Top company preregistration cache write failed', {
        companyUserId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private isCompanyPreregistrationReadDto(value: unknown): value is CompanyPreregistrationReadDto {
    if (!value || typeof value !== 'object') return false;

    const preregistration = value as CompanyPreregistrationReadDto;

    return (
      typeof preregistration.companyUserId === 'string' &&
      Array.isArray(preregistration.origins) &&
      Array.isArray(preregistration.destinations) &&
      Array.isArray(preregistration.items)
    );
  }

  private cacheKey(companyUserId: string): string {
    return `${CACHE_KEY_PREFIX}:${companyUserId}`;
  }
}
