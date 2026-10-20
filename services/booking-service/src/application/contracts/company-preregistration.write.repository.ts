import type { Coordinates } from '../../domain/value-objects/coordinates';
import type {
  CompanyPreregisteredItemReadDto,
  CompanyPreregisteredLocationReadDto,
} from '../dtos/company-preregistration-read.dto';
import type { CompanyPreregisteredItemWriteDto } from '../dtos/company-preregistration-write.dto';

export type CompanyPreregistrationLocationType = 'origins' | 'destinations';

export interface ICompanyPreregistrationWriteRepository {
  addLocation(
    companyUserId: string,
    type: CompanyPreregistrationLocationType,
    coordinates: Coordinates
  ): Promise<CompanyPreregisteredLocationReadDto>;
  updateLocation(
    companyUserId: string,
    type: CompanyPreregistrationLocationType,
    locationId: string,
    coordinates: Coordinates
  ): Promise<void>;
  removeLocation(
    companyUserId: string,
    type: CompanyPreregistrationLocationType,
    locationId: string
  ): Promise<void>;
  addItem(
    companyUserId: string,
    item: CompanyPreregisteredItemWriteDto
  ): Promise<CompanyPreregisteredItemReadDto>;
  updateItem(
    companyUserId: string,
    itemId: string,
    item: CompanyPreregisteredItemWriteDto
  ): Promise<void>;
  removeItem(companyUserId: string, itemId: string): Promise<void>;
}
