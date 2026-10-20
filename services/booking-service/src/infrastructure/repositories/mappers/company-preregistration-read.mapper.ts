import type {
  CompanyPreregisteredItemReadDto,
  CompanyPreregisteredLocationReadDto,
  CompanyPreregistrationReadDto,
} from '../../../application/dtos/company-preregistration-read.dto';
import type { ItemSizeDto } from '../../../application/dtos/enums/item-size.dto';
import type {
  CompanyPreregisteredItem,
  CompanyPreregisteredLocation,
  CompanyPreregistrationDocument,
} from '../../models/company-preregistration.model';

export function toCompanyPreregistrationReadDto(
  preregistration: CompanyPreregistrationDocument
): CompanyPreregistrationReadDto {
  return {
    id: preregistration._id.toString(),
    companyUserId: preregistration.companyUserId,
    origins: preregistration.origins.map((origin) => toCompanyPreregisteredLocationReadDto(origin)),
    destinations: preregistration.destinations.map((destination) =>
      toCompanyPreregisteredLocationReadDto(destination)
    ),
    items: preregistration.items.map((item) => toCompanyPreregisteredItemReadDto(item)),
  };
}

export function toCompanyPreregisteredLocationReadDto(
  location: CompanyPreregisteredLocation
): CompanyPreregisteredLocationReadDto {
  return {
    id: location._id.toString(),
    coordinates: location.coordinates,
  };
}

export function toCompanyPreregisteredItemReadDto(
  item: CompanyPreregisteredItem
): CompanyPreregisteredItemReadDto {
  return {
    id: item._id.toString(),
    description: item.description,
    category: item.category,
    value: item.value,
    size: item.size as unknown as ItemSizeDto,
  };
}
