import type { CompanyPreregistrationReadDto } from '../dtos/company-preregistration-read.dto';

export interface ICompanyPreregistrationReadRepository {
  getByCompanyUserId(companyUserId: string): Promise<CompanyPreregistrationReadDto | undefined>;
}
