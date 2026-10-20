import type {
  CompanyPreregisteredItemWriteDto,
  CompanyPreregisteredLocationWriteDto,
} from '../../dtos/company-preregistration-write.dto';

export type CompanyPreregistrationLocationKind = 'origin' | 'destination';

export class AddCompanyPreregisteredLocationCommand {
  constructor(
    public readonly companyUserId: string,
    public readonly kind: CompanyPreregistrationLocationKind,
    public readonly location: CompanyPreregisteredLocationWriteDto
  ) {}
}

export class UpdateCompanyPreregisteredLocationCommand {
  constructor(
    public readonly companyUserId: string,
    public readonly kind: CompanyPreregistrationLocationKind,
    public readonly locationId: string,
    public readonly location: CompanyPreregisteredLocationWriteDto
  ) {}
}

export class RemoveCompanyPreregisteredLocationCommand {
  constructor(
    public readonly companyUserId: string,
    public readonly kind: CompanyPreregistrationLocationKind,
    public readonly locationId: string
  ) {}
}

export class AddCompanyPreregisteredItemCommand {
  constructor(
    public readonly companyUserId: string,
    public readonly item: CompanyPreregisteredItemWriteDto
  ) {}
}

export class UpdateCompanyPreregisteredItemCommand {
  constructor(
    public readonly companyUserId: string,
    public readonly itemId: string,
    public readonly item: CompanyPreregisteredItemWriteDto
  ) {}
}

export class RemoveCompanyPreregisteredItemCommand {
  constructor(
    public readonly companyUserId: string,
    public readonly itemId: string
  ) {}
}
