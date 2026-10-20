jest.mock('@move/logs-lib', () => ({
  logger: {
    info: jest.fn(),
  },
}));

import {
  AddCompanyPreregisteredItemCommand,
  AddCompanyPreregisteredLocationCommand,
  RemoveCompanyPreregisteredItemCommand,
  RemoveCompanyPreregisteredLocationCommand,
  UpdateCompanyPreregisteredItemCommand,
  UpdateCompanyPreregisteredLocationCommand,
} from '../../../../../src/application/commands/manage-company-preregistration/manage-company-preregistration.command';
import { ManageCompanyPreregistrationHandler } from '../../../../../src/application/commands/manage-company-preregistration/manage-company-preregistration.handler';
import type { CategoryCatalogClient } from '../../../../../src/application/contracts/category-catalog';
import type { ICompanyPreregistrationWriteRepository } from '../../../../../src/application/contracts/company-preregistration.write.repository';
import { ItemSizeDto } from '../../../../../src/application/dtos/enums/item-size.dto';

describe('ManageCompanyPreregistrationHandler', () => {
  const companyUserId = 'company_123';
  const locationId = '507f1f77bcf86cd799439011';
  const itemId = '507f1f77bcf86cd799439012';
  let mockWriteRepository: jest.Mocked<ICompanyPreregistrationWriteRepository>;
  let mockCategoryCatalogClient: jest.Mocked<CategoryCatalogClient>;
  let handler: ManageCompanyPreregistrationHandler;

  beforeEach(() => {
    mockWriteRepository = {
      addLocation: jest.fn().mockResolvedValue({ id: locationId, coordinates: [-56.16, -34.9] }),
      updateLocation: jest.fn().mockResolvedValue(undefined),
      removeLocation: jest.fn().mockResolvedValue(undefined),
      addItem: jest.fn().mockResolvedValue({
        id: itemId,
        description: 'Mesa',
        category: 'Furniture',
        value: '1000',
        size: ItemSizeDto.MEDIUM,
      }),
      updateItem: jest.fn().mockResolvedValue(undefined),
      removeItem: jest.fn().mockResolvedValue(undefined),
    };
    mockCategoryCatalogClient = {
      getActiveCategories: jest.fn().mockResolvedValue([
        { id: 1, nameEn: 'Furniture', nameEs: 'Muebles' },
        { id: 2, nameEn: 'Boxes', nameEs: 'Cajas' },
      ]),
    };
    handler = new ManageCompanyPreregistrationHandler(
      mockWriteRepository,
      mockCategoryCatalogClient
    );
    jest.clearAllMocks();
  });

  it('should add an origin for a company', async () => {
    const result = await handler.addLocation(
      new AddCompanyPreregisteredLocationCommand(companyUserId, 'origin', {
        coordinates: [-56.16, -34.9],
      })
    );

    expect(mockWriteRepository.addLocation).toHaveBeenCalledWith(
      companyUserId,
      'origins',
      [-56.16, -34.9]
    );
    expect(result).toEqual({ id: locationId, coordinates: [-56.16, -34.9] });
  });

  it('should update and remove a destination', async () => {
    await handler.updateLocation(
      new UpdateCompanyPreregisteredLocationCommand(companyUserId, 'destination', locationId, {
        coordinates: [-56.03, -34.83],
      })
    );
    await handler.removeLocation(
      new RemoveCompanyPreregisteredLocationCommand(companyUserId, 'destination', locationId)
    );

    expect(mockWriteRepository.updateLocation).toHaveBeenCalledWith(
      companyUserId,
      'destinations',
      locationId,
      [-56.03, -34.83]
    );
    expect(mockWriteRepository.removeLocation).toHaveBeenCalledWith(
      companyUserId,
      'destinations',
      locationId
    );
  });

  it('should add an item with a canonical MOVE category', async () => {
    const result = await handler.addItem(
      new AddCompanyPreregisteredItemCommand(companyUserId, {
        description: ' Mesa ',
        category: ' muebles ',
        value: '1000',
        size: ItemSizeDto.MEDIUM,
      })
    );

    expect(mockCategoryCatalogClient.getActiveCategories).toHaveBeenCalledTimes(1);
    expect(mockWriteRepository.addItem).toHaveBeenCalledWith(companyUserId, {
      description: 'Mesa',
      category: 'Furniture',
      value: '1000',
      size: ItemSizeDto.MEDIUM,
    });
    expect(result).toEqual({
      id: itemId,
      description: 'Mesa',
      category: 'Furniture',
      value: '1000',
      size: ItemSizeDto.MEDIUM,
    });
  });

  it('should update and remove an item', async () => {
    await handler.updateItem(
      new UpdateCompanyPreregisteredItemCommand(companyUserId, itemId, {
        description: 'Caja',
        category: 'Boxes',
      })
    );
    await handler.removeItem(new RemoveCompanyPreregisteredItemCommand(companyUserId, itemId));

    expect(mockWriteRepository.updateItem).toHaveBeenCalledWith(companyUserId, itemId, {
      description: 'Caja',
      category: 'Boxes',
      value: undefined,
      size: undefined,
    });
    expect(mockWriteRepository.removeItem).toHaveBeenCalledWith(companyUserId, itemId);
  });

  it('should reject an item category outside the MOVE catalog', async () => {
    await expect(
      handler.addItem(
        new AddCompanyPreregisteredItemCommand(companyUserId, {
          description: 'Piano',
          category: 'Piano',
        })
      )
    ).rejects.toMatchObject({
      message: 'category is not a valid MOVE category',
      status: 400,
    });
    expect(mockWriteRepository.addItem).not.toHaveBeenCalled();
  });
});
