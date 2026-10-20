import { ItemSizeDto } from '../../../../../src/application/dtos/enums/item-size.dto';
import { ItemSize } from '../../../../../src/domain/enums/item-size';
import type {
  CompanyPreregisteredItem,
  CompanyPreregisteredLocation,
  CompanyPreregistrationDocument,
} from '../../../../../src/infrastructure/models/company-preregistration.model';
import {
  toCompanyPreregisteredItemReadDto,
  toCompanyPreregisteredLocationReadDto,
  toCompanyPreregistrationReadDto,
} from '../../../../../src/infrastructure/repositories/mappers/company-preregistration-read.mapper';

describe('CompanyPreregistrationReadMapper', () => {
  it('should map a preregistered location to a read dto', () => {
    const location = {
      _id: 'origin_123',
      coordinates: [-56.16, -34.9],
    } as unknown as CompanyPreregisteredLocation;

    const result = toCompanyPreregisteredLocationReadDto(location);

    expect(result).toEqual({
      id: 'origin_123',
      coordinates: [-56.16, -34.9],
    });
  });

  it('should map a preregistered item to a read dto', () => {
    const item = {
      _id: 'item_123',
      description: 'Mesa de oficina',
      category: 'furniture',
      value: '1500',
      size: ItemSize.MEDIUM,
    } as unknown as CompanyPreregisteredItem;

    const result = toCompanyPreregisteredItemReadDto(item);

    expect(result).toEqual({
      id: 'item_123',
      description: 'Mesa de oficina',
      category: 'furniture',
      value: '1500',
      size: ItemSizeDto.MEDIUM,
    });
  });

  it('should map a company preregistration document to a read dto', () => {
    const preregistration = {
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
    } as unknown as CompanyPreregistrationDocument;

    const result = toCompanyPreregistrationReadDto(preregistration);

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
          size: ItemSizeDto.MEDIUM,
        },
      ],
    });
  });
});
