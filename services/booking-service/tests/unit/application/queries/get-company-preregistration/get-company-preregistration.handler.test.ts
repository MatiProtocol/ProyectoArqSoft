import type { ICompanyPreregistrationReadRepository } from '../../../../../src/application/contracts/company-preregistration.read.repository';
import { GetCompanyPreregistrationHandler } from '../../../../../src/application/queries/get-company-preregistration/get-company-preregistration.handler';
import { GetCompanyPreregistrationQuery } from '../../../../../src/application/queries/get-company-preregistration/get-company-preregistration.query';

describe('GetCompanyPreregistrationHandler', () => {
  let mockReadRepository: jest.Mocked<ICompanyPreregistrationReadRepository>;
  let handler: GetCompanyPreregistrationHandler;

  beforeEach(() => {
    mockReadRepository = {
      getByCompanyUserId: jest.fn().mockResolvedValue({
        id: 'pre_123',
        companyUserId: 'company_123',
        origins: [],
        destinations: [],
        items: [],
      }),
    };
    handler = new GetCompanyPreregistrationHandler(mockReadRepository);
  });

  it('should return a company preregistration', async () => {
    const result = await handler.execute(new GetCompanyPreregistrationQuery(' company_123 '));

    expect(mockReadRepository.getByCompanyUserId).toHaveBeenCalledWith('company_123');
    expect(result).toEqual({
      id: 'pre_123',
      companyUserId: 'company_123',
      origins: [],
      destinations: [],
      items: [],
    });
  });

  it('should return an empty preregistration when the company has no saved data yet', async () => {
    mockReadRepository.getByCompanyUserId.mockResolvedValueOnce(undefined);

    await expect(
      handler.execute(new GetCompanyPreregistrationQuery('company_123'))
    ).resolves.toEqual({
      companyUserId: 'company_123',
      origins: [],
      destinations: [],
      items: [],
    });
  });
});
