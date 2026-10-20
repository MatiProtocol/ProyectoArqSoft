import { ItemSizeDto } from '../../../../../src/application/dtos/enums/item-size.dto';
import { CompanyPreregistrationModel } from '../../../../../src/infrastructure/models/company-preregistration.model';
import { CompanyPreregistrationWriteRepository } from '../../../../../src/infrastructure/repositories/implementations/company-preregistration.write.repository';

jest.mock('../../../../../src/infrastructure/models/company-preregistration.model', () => ({
  CompanyPreregistrationModel: {
    findOneAndUpdate: jest.fn(),
  },
}));

const mockedCompanyPreregistrationModel = CompanyPreregistrationModel as jest.Mocked<
  typeof CompanyPreregistrationModel
>;

describe('CompanyPreregistrationWriteRepository', () => {
  const companyUserId = 'company_123';
  const objectId = '507f1f77bcf86cd799439011';
  let repository: CompanyPreregistrationWriteRepository;

  beforeEach(() => {
    repository = new CompanyPreregistrationWriteRepository();
    mockedCompanyPreregistrationModel.findOneAndUpdate.mockResolvedValue({} as never);
    jest.clearAllMocks();
  });

  it('should add an origin with upsert', async () => {
    const result = await repository.addLocation(companyUserId, 'origins', [-56.16, -34.9]);

    expect(mockedCompanyPreregistrationModel.findOneAndUpdate).toHaveBeenCalledWith(
      { companyUserId },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          companyUserId,
        }),
        $push: {
          origins: {
            _id: expect.anything(),
            coordinates: [-56.16, -34.9],
          },
        },
      }),
      { upsert: true, setDefaultsOnInsert: true }
    );
    expect(result).toEqual({
      id: expect.any(String),
      coordinates: [-56.16, -34.9],
    });
  });

  it('should update and remove a destination', async () => {
    await repository.updateLocation(companyUserId, 'destinations', objectId, [-56.03, -34.83]);
    await repository.removeLocation(companyUserId, 'destinations', objectId);

    expect(mockedCompanyPreregistrationModel.findOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      { companyUserId, 'destinations._id': objectId },
      {
        $set: {
          'destinations.$.coordinates': [-56.03, -34.83],
        },
      }
    );
    expect(mockedCompanyPreregistrationModel.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      { companyUserId, 'destinations._id': objectId },
      {
        $pull: {
          destinations: {
            _id: objectId,
          },
        },
      }
    );
  });

  it('should add, update and remove an item', async () => {
    await repository.addItem(companyUserId, {
      description: 'Mesa',
      category: 'Furniture',
      value: '1000',
      size: ItemSizeDto.MEDIUM,
    });
    await repository.updateItem(companyUserId, objectId, {
      description: 'Caja',
      category: 'Boxes',
    });
    await repository.removeItem(companyUserId, objectId);

    expect(mockedCompanyPreregistrationModel.findOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      { companyUserId },
      expect.objectContaining({
        $push: {
          items: {
            _id: expect.anything(),
            description: 'Mesa',
            category: 'Furniture',
            value: '1000',
            size: ItemSizeDto.MEDIUM,
          },
        },
      }),
      { upsert: true, setDefaultsOnInsert: true }
    );
    expect(mockedCompanyPreregistrationModel.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      { companyUserId, 'items._id': objectId },
      {
        $set: {
          'items.$.description': 'Caja',
          'items.$.category': 'Boxes',
        },
        $unset: {
          'items.$.value': '',
          'items.$.size': '',
        },
      }
    );
    expect(mockedCompanyPreregistrationModel.findOneAndUpdate).toHaveBeenNthCalledWith(
      3,
      { companyUserId, 'items._id': objectId },
      {
        $pull: {
          items: {
            _id: objectId,
          },
        },
      }
    );
  });

  it('should throw not found when an existing location is missing', async () => {
    mockedCompanyPreregistrationModel.findOneAndUpdate.mockResolvedValueOnce(null);

    await expect(
      repository.updateLocation(companyUserId, 'origins', objectId, [-56.16, -34.9])
    ).rejects.toMatchObject({
      message: expect.stringContaining('Company preregistered location'),
      status: 404,
    });
  });
});
