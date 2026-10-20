import { ItemSize } from '../../../../../src/domain/enums/item-size';
import { CompanyPreregistrationModel } from '../../../../../src/infrastructure/models/company-preregistration.model';
import { CompanyPreregistrationReadRepository } from '../../../../../src/infrastructure/repositories/implementations/company-preregistration.read.repository';

jest.mock('../../../../../src/infrastructure/models/company-preregistration.model', () => ({
  CompanyPreregistrationModel: {
    findOne: jest.fn(),
  },
}));

const mockedCompanyPreregistrationModel = CompanyPreregistrationModel as jest.Mocked<
  typeof CompanyPreregistrationModel
>;

describe('CompanyPreregistrationReadRepository', () => {
  let repository: CompanyPreregistrationReadRepository;
  let mockLean: jest.Mock;

  beforeEach(() => {
    repository = new CompanyPreregistrationReadRepository();
    jest.clearAllMocks();

    mockLean = jest.fn();
    mockedCompanyPreregistrationModel.findOne.mockReturnValue({ lean: mockLean } as never);
  });

  it('should return company preregistration by company user id', async () => {
    mockLean.mockResolvedValueOnce({
      _id: 'pre_123',
      companyUserId: 'company_123',
      origins: [{ _id: 'origin_123', coordinates: [-56.16, -34.9] }],
      destinations: [{ _id: 'destination_123', coordinates: [-56.03, -34.83] }],
      items: [
        {
          _id: 'item_123',
          description: 'Mesa de oficina',
          category: 'furniture',
          value: '1500',
          size: ItemSize.MEDIUM,
        },
      ],
    });

    const result = await repository.getByCompanyUserId('company_123');

    expect(mockedCompanyPreregistrationModel.findOne).toHaveBeenCalledWith({
      companyUserId: 'company_123',
    });
    expect(mockLean).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: 'pre_123',
      companyUserId: 'company_123',
      origins: [{ id: 'origin_123', coordinates: [-56.16, -34.9] }],
      destinations: [{ id: 'destination_123', coordinates: [-56.03, -34.83] }],
      items: [
        {
          id: 'item_123',
          description: 'Mesa de oficina',
          category: 'furniture',
          value: '1500',
          size: ItemSize.MEDIUM,
        },
      ],
    });
  });

  it('should return undefined when company preregistration does not exist', async () => {
    mockLean.mockResolvedValueOnce(null);

    const result = await repository.getByCompanyUserId('company_123');

    expect(mockedCompanyPreregistrationModel.findOne).toHaveBeenCalledWith({
      companyUserId: 'company_123',
    });
    expect(result).toBeUndefined();
  });

  it('should map empty preregistered lists', async () => {
    mockLean.mockResolvedValueOnce({
      _id: 'pre_123',
      companyUserId: 'company_123',
      origins: [],
      destinations: [],
      items: [],
    });

    const result = await repository.getByCompanyUserId('company_123');

    expect(result).toEqual({
      id: 'pre_123',
      companyUserId: 'company_123',
      origins: [],
      destinations: [],
      items: [],
    });
  });
});
