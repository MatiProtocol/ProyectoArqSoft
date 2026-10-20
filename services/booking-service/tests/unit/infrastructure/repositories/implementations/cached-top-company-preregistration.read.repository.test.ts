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

import type { ICompanyPreregistrationReadRepository } from '../../../../../src/application/contracts/company-preregistration.read.repository';
import type { CompanyPreregistrationReadDto } from '../../../../../src/application/dtos/company-preregistration-read.dto';
import { ItemSizeDto } from '../../../../../src/application/dtos/enums/item-size.dto';
import { CachedTopCompanyPreregistrationReadRepository } from '../../../../../src/infrastructure/repositories/implementations/cached-top-company-preregistration.read.repository';

describe('CachedTopCompanyPreregistrationReadRepository', () => {
  let sourceRepository: jest.Mocked<ICompanyPreregistrationReadRepository>;
  let redis: {
    get: jest.Mock;
    setEx: jest.Mock;
  };
  let repository: CachedTopCompanyPreregistrationReadRepository;
  let preregistration: CompanyPreregistrationReadDto;

  beforeEach(() => {
    preregistration = {
      id: 'pre_123',
      companyUserId: 'company_123',
      origins: [{ id: 'origin_123', coordinates: [-56.16, -34.9] }],
      destinations: [{ id: 'destination_123', coordinates: [-56.03, -34.83] }],
      items: [
        {
          id: 'item_123',
          description: 'Mesa de oficina',
          category: 'Furniture',
          value: '1500',
          size: ItemSizeDto.MEDIUM,
        },
      ],
    };
    sourceRepository = {
      getByCompanyUserId: jest.fn(),
    };
    redis = {
      get: jest.fn(),
      setEx: jest.fn(),
    };
    repository = new CachedTopCompanyPreregistrationReadRepository(sourceRepository, redis);
    jest.clearAllMocks();
  });

  it('should return cached preregistration without querying the source repository', async () => {
    redis.get.mockResolvedValueOnce(JSON.stringify(preregistration));

    const result = await repository.getByCompanyUserId('company_123');

    expect(result).toEqual(preregistration);
    expect(redis.get).toHaveBeenCalledWith(
      'booking-service:top-company-preregistration:company_123'
    );
    expect(sourceRepository.getByCompanyUserId).not.toHaveBeenCalled();
  });

  it('should query source repository and cache preregistration on cache miss', async () => {
    redis.get.mockResolvedValueOnce(null);
    sourceRepository.getByCompanyUserId.mockResolvedValueOnce(preregistration);

    const result = await repository.getByCompanyUserId('company_123');

    expect(result).toEqual(preregistration);
    expect(sourceRepository.getByCompanyUserId).toHaveBeenCalledWith('company_123');
    expect(redis.setEx).toHaveBeenCalledWith(
      'booking-service:top-company-preregistration:company_123',
      300,
      JSON.stringify(preregistration)
    );
  });

  it('should not cache missing preregistration', async () => {
    redis.get.mockResolvedValueOnce(null);
    sourceRepository.getByCompanyUserId.mockResolvedValueOnce(undefined);

    const result = await repository.getByCompanyUserId('company_123');

    expect(result).toBeUndefined();
    expect(redis.setEx).not.toHaveBeenCalled();
  });

  it('should query source repository when Redis read fails', async () => {
    redis.get.mockRejectedValueOnce(new Error('Redis unavailable'));
    sourceRepository.getByCompanyUserId.mockResolvedValueOnce(preregistration);

    const result = await repository.getByCompanyUserId('company_123');

    expect(result).toEqual(preregistration);
    expect(sourceRepository.getByCompanyUserId).toHaveBeenCalledWith('company_123');
  });
});
