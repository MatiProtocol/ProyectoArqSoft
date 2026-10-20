import type { Coordinates } from '../../domain/value-objects/coordinates';
import type { ItemSizeDto } from './enums/item-size.dto';

export type CompanyPreregisteredLocationWriteDto = {
  coordinates: Coordinates;
};

export type CompanyPreregisteredItemWriteDto = {
  description: string;
  category: string;
  value?: string;
  size?: ItemSizeDto;
};
