import type { Coordinates } from '../../domain/value-objects/coordinates';
import type { ItemSizeDto } from './enums/item-size.dto';

export type CompanyPreregisteredLocationReadDto = {
  id: string;
  coordinates: Coordinates;
};

export type CompanyPreregisteredItemReadDto = {
  id: string;
  description: string;
  category: string;
  value?: string;
  size?: ItemSizeDto;
};

export type CompanyPreregistrationReadDto = {
  id?: string;
  companyUserId: string;
  origins: CompanyPreregisteredLocationReadDto[];
  destinations: CompanyPreregisteredLocationReadDto[];
  items: CompanyPreregisteredItemReadDto[];
};
